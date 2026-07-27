import type { LucideIcon } from 'lucide-react';

import { GlassCard } from '@/components/ui/glass-card';

export type StatCard = {
  id: string;
  label: string;
  value: number | string;
  icon: LucideIcon;
  /** Tailwind text-color class applied to both the icon and the value. */
  color: string;
  /** Tailwind border/gradient classes for the icon's backing tile. */
  bg: string;
};

/**
 * The `{icon, label, value}` GlassCard grid repeated identically across
 * dashboard/customers, dashboard/analytics, and admin -- extracted here so a
 * fourth summary-card page doesn't add a fourth copy.
 */
export function StatCardGrid({ cards }: { cards: StatCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ id, label, value, icon: Icon, color, bg }) => (
        <GlassCard key={id} hoverable className="flex items-center gap-4 group">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-gradient-to-b ${bg} ${color}`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
              {label}
            </p>
            <p className={`font-mono-numeric text-3xl font-bold tracking-tight mt-0.5 ${color}`}>
              {value}
            </p>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
