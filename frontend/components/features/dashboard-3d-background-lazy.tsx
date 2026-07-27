'use client';

import { lazy, Suspense, useEffect, useState } from 'react';

/**
 * Next's `next/dynamic(..., { ssr: false })` looks like the obvious tool
 * here, but in the App Router it doesn't scope to just this component --
 * it forces the *entire* route segment (including app/dashboard/layout.tsx
 * and every page under it) to bail out of SSR entirely, per Next.js's
 * documented ssr:false + Server Component route-segment behavior. That
 * would kill server rendering for every dashboard page's real data.
 *
 * Instead, gate on mount: render nothing until after the first client
 * effect, so the three.js/@react-three/fiber chunk is only ever fetched
 * and rendered client-side, without touching the route's SSR behavior at
 * all (this is a plain client component making a runtime decision, not a
 * Next.js-special-cased dynamic import).
 */
const Dashboard3DBackground = lazy(() =>
  import('@/components/features/dashboard-3d-background').then((mod) => ({
    default: mod.Dashboard3DBackground,
  }))
);

export function Dashboard3DBackgroundLazy() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Suspense fallback={null}>
      <Dashboard3DBackground />
    </Suspense>
  );
}
