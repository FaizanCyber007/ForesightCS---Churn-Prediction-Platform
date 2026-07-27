import * as React from 'react';

import { cn } from '@/lib/cn';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export function GlassCard({
  className,
  hoverable = false,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[28px] border border-white/8 bg-zinc-900/40 p-6 shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-all duration-300',
        // Ambient inside-card gradient
        'before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-b before:from-white/[0.03] before:to-transparent',
        hoverable &&
          'hover:-translate-y-1 hover:border-emerald-400/20 hover:bg-zinc-900/50 hover:shadow-[0_32px_80px_rgba(16,185,129,0.08)] active:translate-y-0',
        className
      )}
      {...props}
    />
  );
}
