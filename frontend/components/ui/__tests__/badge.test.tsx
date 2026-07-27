import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge } from '../badge';

describe('Badge component', () => {
  it('should render children correctly', () => {
    render(<Badge>New Feature</Badge>);
    expect(screen.getByText('New Feature')).toBeInTheDocument();
  });

  it('should apply default (primary) variant classes', () => {
    render(<Badge>Primary</Badge>);
    const badge = screen.getByText('Primary');
    expect(badge.className).toContain('bg-white/5');
  });

  it('should apply warning variant classes when specified', () => {
    render(<Badge variant="warning">Warning</Badge>);
    const badge = screen.getByText('Warning');
    expect(badge.className).toContain('bg-amber-400/10');
  });

  it('should apply danger variant classes when specified', () => {
    render(<Badge variant="danger">Danger</Badge>);
    const badge = screen.getByText('Danger');
    expect(badge.className).toContain('bg-rose-400/10');
  });
});
