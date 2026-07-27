import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoginForm } from '../auth-form';
import { AuthProvider } from '@/context/auth-context';

describe('LoginForm component', () => {
  it('should render the login form by default', () => {
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );
    expect(screen.getByRole('heading', { name: /sign in to your command center/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email or username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('should display validation errors when submitting empty form', async () => {
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /enter the command center/i }));

    await waitFor(() => {
      expect(screen.getByText(/enter your email or username/i)).toBeInTheDocument();
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

});
