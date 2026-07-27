import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { WorkspaceSettings } from '../workspace-settings';

vi.mock('@/app/actions', () => ({
  getWorkspaceAction: vi.fn(),
  updateWorkspaceAction: vi.fn(),
}));

const mockRefreshSession = vi.fn();

vi.mock('@/context/auth-context', () => ({
  useAuth: () => ({ refreshSession: mockRefreshSession }),
}));

describe('WorkspaceSettings component', () => {
  beforeEach(async () => {
    mockRefreshSession.mockClear();
    const { getWorkspaceAction, updateWorkspaceAction } = await import('@/app/actions');
    vi.mocked(getWorkspaceAction).mockReset();
    vi.mocked(updateWorkspaceAction).mockReset();
    vi.mocked(getWorkspaceAction).mockResolvedValue({
      id: 'org-1',
      name: "Ari's Workspace",
      slug: 'aris-workspace',
    });
  });

  it('loads and displays the current workspace name', async () => {
    render(<WorkspaceSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Ari's Workspace")).toBeInTheDocument();
    });
    expect(screen.getByText(/aris-workspace/i)).toBeInTheDocument();
  });

  it('blocks submit with a validation error when the name is cleared', async () => {
    const { updateWorkspaceAction } = await import('@/app/actions');
    render(<WorkspaceSettings />);
    await waitFor(() => screen.getByDisplayValue("Ari's Workspace"));

    fireEvent.change(screen.getByDisplayValue("Ari's Workspace"), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save workspace changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/workspace name is required/i)).toBeInTheDocument();
    });
    expect(updateWorkspaceAction).not.toHaveBeenCalled();
  });

  it('refreshes the session after a successful save', async () => {
    const { updateWorkspaceAction } = await import('@/app/actions');
    vi.mocked(updateWorkspaceAction).mockResolvedValue({
      success: true,
      data: { id: 'org-1', name: 'Renamed Workspace', slug: 'aris-workspace' },
    });

    render(<WorkspaceSettings />);
    await waitFor(() => screen.getByDisplayValue("Ari's Workspace"));
    fireEvent.click(screen.getByRole('button', { name: /save workspace changes/i }));

    await waitFor(() => {
      expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    });
  });

  it('shows an error message instead of a blank form when the workspace fails to load', async () => {
    const { getWorkspaceAction } = await import('@/app/actions');
    // e.g. a superuser with no organization -- GET /api/v1/organizations/me/
    // 404s, so this mount fetch always rejects.
    vi.mocked(getWorkspaceAction).mockReset();
    vi.mocked(getWorkspaceAction).mockRejectedValue(new Error('Not found.'));

    render(<WorkspaceSettings />);

    await waitFor(() => {
      expect(screen.getByText(/could not load your workspace/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /save workspace changes/i })).not.toBeInTheDocument();
  });
});
