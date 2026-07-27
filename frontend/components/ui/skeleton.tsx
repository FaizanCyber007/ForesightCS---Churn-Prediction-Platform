import * as React from 'react';

import { cn } from '@/lib/cn';

/**
 * A shimmering skeleton block used to mirror the shape of incoming data
 * inside loading.tsx boundaries.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative overflow-hidden rounded-2xl bg-white/[0.06]',
        className
      )}
      {...props}
    >
      <span className="absolute inset-0 animate-[shimmer_2s_infinite] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)]" />
    </div>
  );
}
