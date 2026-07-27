import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from '../button';

describe('Button component', () => {
  it('should render children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('should apply primary variant classes by default', () => {
    render(<Button>Primary Button</Button>);
    const button = screen.getByRole('button');
    // Check if it has a class that is unique to the brand/primary variant
    expect(button.className).toContain('from-emerald-500');
    expect(button.className).toContain('text-white');
  });

  it('should handle the disabled state correctly', () => {
    render(<Button disabled>Disabled Action</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button.className).toContain('disabled:opacity-50');
  });
});
