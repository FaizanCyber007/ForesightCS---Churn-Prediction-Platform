import { serverApiClient as apiClient } from '@/lib/serverApiClient';
import type { UserSession } from '@/context/auth-context';
import type { ProfileSettingsFormValues, WorkspaceSettingsFormValues } from '@/lib/schemas';

export type WorkspaceRecord = {
  id: string;
  name: string;
  slug: string;
};

/** PATCH backend/core/views.py::UserMeView -- returns the full updated session. */
export async function updateUserProfile(values: ProfileSettingsFormValues): Promise<UserSession> {
  const data = await apiClient.patch<{ user: UserSession }>('/api/v1/auth/user/', values);
  return data.user;
}

/** GET backend/core/views.py::OrganizationMeView. */
export async function getWorkspace(): Promise<WorkspaceRecord> {
  return apiClient.get<WorkspaceRecord>('/api/v1/organizations/me/');
}

/** PATCH backend/core/views.py::OrganizationMeView. */
export async function updateWorkspace(
  values: WorkspaceSettingsFormValues
): Promise<WorkspaceRecord> {
  return apiClient.patch<WorkspaceRecord>('/api/v1/organizations/me/', values);
}

/** Server-side superuser check for gating admin-only Server Actions (frontend/app/actions.ts) -- the browser session's real cookies are forwarded here, unlike services/admin.ts's static Basic Auth. */
export async function isCurrentUserSuperuser(): Promise<boolean> {
  try {
    const data = await apiClient.get<{ user: UserSession }>('/api/v1/auth/me/');
    return data.user.isSuperuser;
  } catch {
    return false;
  }
}
