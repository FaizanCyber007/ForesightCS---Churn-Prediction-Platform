'use client';

import { GlassCard } from '@/components/ui/glass-card';
import type { CustomerDetail } from '@/services/api';

const CATEGORY_COLORS: Record<string, string> = {
  product: '#34d399',
  billing: '#a78bfa',
  support: '#f59e0b',
  signal: '#60a5fa',
};

export function TimelineCard({ timeline }: { timeline: CustomerDetail['timeline'] }) {
  return (
    <GlassCard className="space-y-4">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Timeline
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">
          Recent events &amp; signal shifts
        </h2>
      </div>
      <div className="relative space-y-3 pl-6 before:absolute before:bottom-2 before:left-2 before:top-2 before:w-px before:bg-white/8">
        {timeline.map((event) => {
          const dotColor = CATEGORY_COLORS[event.category] ?? '#71717a';
          return (
            <div
              key={event.id}
              className="relative rounded-3xl border border-white/8 bg-black/20 p-4"
            >
              {/* Timeline dot */}
              <span
                className="absolute -left-[14px] top-5 h-3 w-3 rounded-full border-2 border-[#0a0a0a]"
                style={{ backgroundColor: dotColor }}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium text-white">{event.title}</p>
                <span
                  className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.3em]"
                  style={{
                    backgroundColor: `${dotColor}20`,
                    color: dotColor,
                    border: `1px solid ${dotColor}40`,
                  }}
                >
                  {event.category}
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-400">{event.detail}</p>
              <p className="mt-3 text-xs text-zinc-600">
                {new Date(event.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
