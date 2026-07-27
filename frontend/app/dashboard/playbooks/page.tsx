import {
  Activity,
  BarChart3,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

import { GlassCard } from '@/components/ui/glass-card';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Button } from '@/components/ui/button';
import { PlaybookList } from '@/components/features/playbook-list';
import { PlaybookFormModal } from '@/components/features/playbook-form-modal';
import { getPlaybooks } from '@/services/playbooks';

export const dynamic = 'force-dynamic';

export default async function PlaybooksPage() {
  const playbooks = await getPlaybooks();
  const activeCount = playbooks.filter((p) => p.status === 'active').length;
  const customersInPlay = playbooks.reduce((sum, p) => sum + p.customersInPlay, 0);

  return (
    <PageWrapper className="space-y-8 py-8 lg:py-10">
      {/* Header */}
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Automation ledger</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">Save-Play Playbooks</h1>
            <p className="mt-1 text-sm text-zinc-400 leading-relaxed max-w-xl">
              Automated response workflows triggered by custom health signals, login drop thresholds, or critical support trends.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button variant="secondary" size="sm" asChild>
              <Link href="/dashboard/rules/new">
                <Zap className="h-4 w-4" /> Define new rule
              </Link>
            </Button>
            <PlaybookFormModal />
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <GlassCard className="flex items-center gap-4 relative overflow-hidden group">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500/20 to-transparent" />
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/8 text-emerald-300">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Active playbooks</p>
              <p className="font-mono-numeric text-2xl font-bold text-white mt-0.5">{activeCount}</p>
            </div>
          </GlassCard>

          <GlassCard className="flex items-center gap-4 relative overflow-hidden group">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500/20 to-transparent" />
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/8 text-amber-300">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Customers in play</p>
              <p className="font-mono-numeric text-2xl font-bold text-white mt-0.5">{customersInPlay}</p>
            </div>
          </GlassCard>

          <GlassCard className="flex items-center gap-4 relative overflow-hidden group">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-500/20 to-transparent" />
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/8 text-violet-300">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Total playbooks</p>
              <p className="font-mono-numeric text-2xl font-bold text-white mt-0.5">{playbooks.length}</p>
            </div>
          </GlassCard>
        </div>
      </section>

      <PlaybookList playbooks={playbooks} />
    </PageWrapper>
  );
}
