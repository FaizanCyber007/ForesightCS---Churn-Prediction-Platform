'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { apiClient, UNAUTHORIZED_EVENT } from '@/lib/apiClient';

export interface UserSession {
  id: string;
  fullName: string;
  companyName: string;
  role: string;
  title: string;
  email: string;
  username: string;
  isSuperuser: boolean;
}

interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (
    fullName: string,
    companyName: string,
    role: string,
    email: string,
    username: string,
    password: string
  ) => Promise<void>;
  logout: () => void;
  /** Replaces local session state directly from an already-fetched session object -- no network call. */
  updateUser: (session: UserSession) => void;
  /** Re-fetches /auth/me/ and applies the result -- for callers that only got back a partial resource (e.g. an Organization) and need the rest of `user` recomputed server-side. */
  refreshSession: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();

  const logout = React.useCallback(() => {
    setUser(null);
    // Fire-and-forget: clears the HttpOnly cookies server-side (client JS
    // can never read/clear them directly -- that's the point of HttpOnly)
    // and blacklists the refresh token. Safe to call even if the session
    // is already gone (backend/core/views.py::LogoutView tolerates that).
    apiClient
      .post('/api/v1/auth/logout/', undefined, { skipAuthRedirect: true })
      .catch(() => {});
  }, []);

  const updateUser = React.useCallback((session: UserSession) => {
    setUser(session);
  }, []);

  const refreshSession = React.useCallback(async () => {
    try {
      const data = await apiClient.get<{ user: UserSession }>('/api/v1/auth/me/', {
        skipAuthRedirect: true,
      });
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  // Resolve real session state from the backend on first load instead of
  // trusting client-side-only state that could be stale (cookie expired
  // server-side) or spoofed (the old localStorage-based approach).
  React.useEffect(() => {
    let cancelled = false;

    apiClient
      .get<{ user: UserSession }>('/api/v1/auth/me/', { skipAuthRedirect: true })
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Any other request's 401 means the session just expired server-side
  // (expired/blacklisted token) -- clear state and bounce to /login.
  React.useEffect(() => {
    function handleUnauthorized() {
      setUser(null);
      router.push('/login');
    }
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [router]);

  const login = async (identifier: string, password: string) => {
    const data = await apiClient.post<{ user: UserSession }>(
      '/api/v1/auth/login/',
      { identifier, password },
      { skipAuthRedirect: true }
    );
    setUser(data.user);
  };

  const register = async (
    fullName: string,
    companyName: string,
    role: string,
    email: string,
    username: string,
    password: string
  ) => {
    // Founds a brand-new Organization + its first (admin) CustomUser and
    // logs them straight in -- see backend/core/serializers.py::RegisterSerializer,
    // which persists `title` onto the new user (see CustomUser.title).
    const data = await apiClient.post<{ user: UserSession }>(
      '/api/v1/auth/register/',
      {
        full_name: fullName,
        company_name: companyName,
        title: role,
        email,
        username,
        password,
      },
      { skipAuthRedirect: true }
    );
    setUser(data.user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
