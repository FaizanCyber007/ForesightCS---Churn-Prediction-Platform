import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { RuleBuilderForm } from '../rule-builder-form';

// Mock the server action -- these tests are about client-side Zod
// validation blocking the submit before it's ever called, not the action
// itself (see app/actions.ts's own server-side re-validation, tested via
// the backend's pytest suite instead).
vi.mock('@/app/actions', () => ({
  createHealthRuleAction: vi.fn(),
}));

const metricOptions = [{ value: 'login', label: 'Login frequency' }];

describe('RuleBuilderForm component', () => {
  it('renders the rule fields', () => {
    render(<RuleBuilderForm metricOptions={metricOptions} />);

    expect(screen.getByPlaceholderText(/login drop watchlist/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save logic rule/i })).toBeInTheDocument();
  });

  it('shows a Zod validation error and never calls the server action when the rule name is too short', async () => {
    const { createHealthRuleAction } = await import('@/app/actions');
    render(<RuleBuilderForm metricOptions={metricOptions} />);

    // Name starts empty (below the 3-character minimum in healthRuleSchema)
    // -- submitting without typing a name should be blocked client-side.
    fireEvent.click(screen.getByRole('button', { name: /save logic rule/i }));

    await waitFor(() => {
      expect(screen.getByText(/rule name must be at least 3 characters/i)).toBeInTheDocument();
    });
    expect(createHealthRuleAction).not.toHaveBeenCalled();
  });

  it('rejects a weight outside the 1-100 range', async () => {
    const { createHealthRuleAction } = await import('@/app/actions');
    render(<RuleBuilderForm metricOptions={metricOptions} />);

    fireEvent.change(screen.getByPlaceholderText(/login drop watchlist/i), {
      target: { value: 'Valid rule name' },
    });
    const weightInput = screen.getByDisplayValue('10');
    fireEvent.change(weightInput, { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: /save logic rule/i }));

    await waitFor(() => {
      expect(screen.getByText(/weight must be 100 or less/i)).toBeInTheDocument();
    });
    expect(createHealthRuleAction).not.toHaveBeenCalled();
  });
});
