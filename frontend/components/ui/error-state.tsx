'use client';

import Link from 'next/link';
import { ServerCrash } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { PageWrapper } from '@/components/layout/page-wrapper';

export function ErrorState({
  eyebrow,
  title,
  description,
  reset,
  homeHref = '/',
  homeLabel = 'Go home',
}: {
  eyebrow: string;
  title: string;
  description: string;
  reset: () => void;
  homeHref?: string;
  homeLabel?: string;
}) {
  return (
    <PageWrapper className="flex min-h-screen items-center justify-center py-10">
      <GlassCard className="max-w-xl space-y-5 text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-zinc-500">{eyebrow}</p>
        <h1 className="text-3xl font-semibold text-white">{title}</h1>
        <p className="text-zinc-400">{description}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>Retry</Button>
          <Button variant="secondary" asChild>
            <Link href={homeHref}>{homeLabel}</Link>
          </Button>
        </div>
      </GlassCard>
    </PageWrapper>
  );
}

/**
 * Distinct from `ErrorState`: shown when the Django backend itself is
 * unreachable or 5xx'd (lib/apiClient.ts's `isServiceUnavailable`), not a
 * routine 400/404/validation failure -- "the product is down" reads
 * differently to a user than "that page doesn't exist."
 */
export function ServiceUnavailableState({ reset }: { reset: () => void }) {
  return (
    <PageWrapper className="flex min-h-screen items-center justify-center py-10">
      <GlassCard className="max-w-xl space-y-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10">
          <ServerCrash className="h-7 w-7 text-amber-400" />
        </div>
        <p className="text-sm uppercase tracking-[0.35em] text-zinc-500">Service unavailable</p>
        <h1 className="text-3xl font-semibold text-white">
          ForesightCS is temporarily unavailable.
        </h1>
        <p className="text-zinc-400">
          We couldn&apos;t reach the backend just now. This is usually temporary -- please try
          again in a moment.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>Retry</Button>
          <Button variant="secondary" asChild>
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </GlassCard>
    </PageWrapper>
  );
}
