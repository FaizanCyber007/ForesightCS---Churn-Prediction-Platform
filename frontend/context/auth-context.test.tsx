import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AuthProvider, useAuth, type UserSession } from './auth-context';

vi.mock('@/lib/apiClient', async () => {
  const actual = await vi.importActual<typeof import('@/lib/apiClient')>('@/lib/apiClient');
  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
    },
  };
});

const sampleSession: UserSession = {
  id: '2',
  fullName: 'Updated Name',
  companyName: 'Co',
  role: 'Admin',
  title: 'CEO',
  email: 'a@b.test',
  username: 'a',
  isSuperuser: false,
};

function Probe() {
  const { user, updateUser, refreshSession } = useAuth();
  return (
    <div>
      <span data-testid="name">{user?.fullName ?? 'none'}</span>
      <button onClick={() => updateUser(sampleSession)}>set</button>
      <button onClick={() => refreshSession()}>refresh</button>
    </div>
  );
}

describe('AuthContext updateUser/refreshSession', () => {
  beforeEach(async () => {
    const { apiClient } = await import('@/lib/apiClient');
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(apiClient.get).mockResolvedValue({ user: null });
  });

  it('updateUser replaces local session state directly, without a network call', async () => {
    const { apiClient } = await import('@/lib/apiClient');
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await act(async () => {}); // let the mount effect's /auth/me/ resolution fully settle first
    const callsBeforeClick = vi.mocked(apiClient.get).mock.calls.length;

    await act(async () => {
      screen.getByText('set').click();
    });

    expect(screen.getByTestId('name').textContent).toBe('Updated Name');
    expect(vi.mocked(apiClient.get).mock.calls.length).toBe(callsBeforeClick);
  });

  it('refreshSession re-fetches /auth/me/ and applies the result', async () => {
    const { apiClient } = await import('@/lib/apiClient');
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ user: null }) // initial mount effect
      .mockResolvedValueOnce({
        user: { ...sampleSession, id: '3', fullName: 'Refreshed Name' },
      });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await act(async () => {}); // let the mount effect's /auth/me/ resolution fully settle first

    await act(async () => {
      screen.getByText('refresh').click();
    });

    expect(screen.getByTestId('name').textContent).toBe('Refreshed Name');
  });
});
