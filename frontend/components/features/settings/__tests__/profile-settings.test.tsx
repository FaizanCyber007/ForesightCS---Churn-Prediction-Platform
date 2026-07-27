import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ProfileSettings } from '../profile-settings';

vi.mock('@/app/actions', () => ({
  updateProfileAction: vi.fn(),
}));

const mockUpdateUser = vi.fn();
const baseUser = {
  id: '1',
  fullName: 'Ari Johnson',
  companyName: "Ari's Workspace",
  role: 'Admin',
  title: 'Founder',
  email: 'ari@ari-workspace.test',
  username: 'ari.johnson',
  isSuperuser: false,
};

vi.mock('@/context/auth-context', () => ({
  useAuth: () => ({ user: baseUser, updateUser: mockUpdateUser }),
}));

describe('ProfileSettings component', () => {
  beforeEach(() => {
    mockUpdateUser.mockClear();
  });

  it('renders fields seeded from the current user', () => {
    render(<ProfileSettings />);

    expect(screen.getByDisplayValue('Ari Johnson')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Founder')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ari@ari-workspace.test')).toBeInTheDocument();
  });

  it('shows a validation error and never calls the action when the email is invalid', async () => {
    const { updateProfileAction } = await import('@/app/actions');
    render(<ProfileSettings />);

    fireEvent.change(screen.getByDisplayValue('ari@ari-workspace.test'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save profile changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/enter a valid work email/i)).toBeInTheDocument();
    });
    expect(updateProfileAction).not.toHaveBeenCalled();
  });

  it('calls updateUser with the returned session on a successful save', async () => {
    const { updateProfileAction } = await import('@/app/actions');
    const updatedSession = { ...baseUser, fullName: 'Jordan Rivers', title: 'VP CS' };
    vi.mocked(updateProfileAction).mockResolvedValue({ success: true, data: updatedSession });

    render(<ProfileSettings />);
    fireEvent.click(screen.getByRole('button', { name: /save profile changes/i }));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith(updatedSession);
    });
  });
});
