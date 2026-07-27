import 'server-only';

import { cookies } from 'next/headers';

import { apiClient, type RequestOptions } from '@/lib/apiClient';

/**
 * Server-side counterpart to `apiClient`.
 *
 * `services/*.ts` (besides `admin.ts`, which uses its own Basic Auth) run
 * in Server Components and Server Actions -- there is no browser cookie
 * jar on this side of the request for `apiClient`'s `credentials: 'include'`
 * to rely on. This reads the incoming request's session cookies via
 * `next/headers` and forwards them explicitly on every call instead, so
 * `backend/core.authentication.CookieJWTAuthentication` sees the same
 * session the browser is logged in with.
 *
 * Marked `server-only` so an accidental import from a Client Component
 * fails the build loudly instead of silently shipping broken auth.
 */
async function withSessionCookies(options?: RequestOptions): Promise<RequestOptions> {
  const cookieHeader = (await cookies()).toString();
  if (!cookieHeader) {
    return options ?? {};
  }
  const headers = new Headers(options?.headers);
  headers.set('Cookie', cookieHeader);
  return { ...options, headers };
}

export const serverApiClient = {
  get: async <T>(path: string, options?: RequestOptions) =>
    apiClient.get<T>(path, await withSessionCookies(options)),
  post: async <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiClient.post<T>(path, body, await withSessionCookies(options)),
  patch: async <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiClient.patch<T>(path, body, await withSessionCookies(options)),
  put: async <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiClient.put<T>(path, body, await withSessionCookies(options)),
  delete: async <T>(path: string, options?: RequestOptions) =>
    apiClient.delete<T>(path, await withSessionCookies(options)),
};
