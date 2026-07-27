import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GlassCard } from '../glass-card';

describe('GlassCard component', () => {
  it('should render children correctly', () => {
    render(
      <GlassCard>
        <div data-testid="child-element">Test Content</div>
      </GlassCard>
    );
    expect(screen.getByTestId('child-element')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should apply the default glassmorphism classes', () => {
    const { container } = render(<GlassCard>Content</GlassCard>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('backdrop-blur-2xl');
    expect(card.className).toContain('bg-zinc-900/40');
    expect(card.className).toContain('border-white/8');
  });

  it('should apply hover classes when hoverable is true', () => {
    const { container } = render(<GlassCard hoverable>Content</GlassCard>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('hover:-translate-y-1');
    expect(card.className).toContain('hover:bg-zinc-900/50');
    expect(card.className).toContain('transition-all');
  });

  it('should accept additional custom classes via className prop', () => {
    const { container } = render(<GlassCard className="custom-class-xyz">Content</GlassCard>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('custom-class-xyz');
  });
});
