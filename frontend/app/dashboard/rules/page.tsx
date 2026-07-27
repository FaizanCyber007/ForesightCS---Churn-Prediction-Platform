import Link from 'next/link';
import { Activity, Gauge, ShieldCheck, Zap } from 'lucide-react';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { RuleList } from '@/components/features/rule-list';
import { getHealthRules } from '@/services/rules';

export const dynamic = 'force-dynamic';

export default async function RulesPage() {
  const rules = await getHealthRules();
  const activeCount = rules.filter((rule) => rule.isActive).length;
  const totalWeight = rules.reduce((sum, rule) => sum + rule.weight, 0);

  return (
    <PageWrapper className="space-y-8 py-8 lg:py-10">
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Predictive rules engine</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">Health Rules</h1>
            <p className="mt-1 text-sm text-zinc-400 leading-relaxed max-w-xl">
              Weighted telemetry signals the churn scoring engine evaluates against every customer.
            </p>
          </div>
          <Button variant="brand" size="sm" asChild>
            <Link href="/dashboard/rules/new">
              <Zap className="h-4 w-4" /> New rule
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <GlassCard className="flex items-center gap-4 relative overflow-hidden group">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500/20 to-transparent" />
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/8 text-emerald-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Active rules</p>
              <p className="font-mono-numeric text-2xl font-bold text-white mt-0.5">{activeCount}</p>
            </div>
          </GlassCard>

          <GlassCard className="flex items-center gap-4 relative overflow-hidden group">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-500/20 to-transparent" />
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/8 text-violet-300">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Total rules</p>
              <p className="font-mono-numeric text-2xl font-bold text-white mt-0.5">{rules.length}</p>
            </div>
          </GlassCard>

          <GlassCard className="flex items-center gap-4 relative overflow-hidden group">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500/20 to-transparent" />
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/8 text-amber-300">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Combined score impact</p>
              <p className="font-mono-numeric text-2xl font-bold text-white mt-0.5">-{totalWeight} pts</p>
            </div>
          </GlassCard>
        </div>
      </section>

      <RuleList rules={rules} />
    </PageWrapper>
  );
}
