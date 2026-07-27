export type StatCardTone = 'neutral' | 'success' | 'warning' | 'danger';

/**
 * Centralizes the icon/border/gradient classes for each stat-card tone so
 * customers, analytics, and other StatCardGrid consumers don't each redefine
 * the same four Tailwind combinations.
 */
export const STAT_CARD_TONE_STYLES: Record<StatCardTone, { color: string; bg: string }> = {
  neutral: { color: 'text-zinc-300', bg: 'border-zinc-400/10 from-zinc-500/10 to-transparent' },
  success: { color: 'text-emerald-300', bg: 'border-emerald-400/20 from-emerald-500/10 to-transparent' },
  warning: { color: 'text-amber-300', bg: 'border-amber-400/20 from-amber-500/10 to-transparent' },
  danger: { color: 'text-rose-300', bg: 'border-rose-400/20 from-rose-500/10 to-transparent' },
};
