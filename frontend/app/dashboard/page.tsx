import { ShieldAlert, ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { DashboardMetrics } from '@/components/features/dashboard-metrics';
import { AIInsights } from '@/components/features/ai-insights';
import { CustomerTable } from '@/components/features/customer-table';
import { AreaRevenueChart, DonutHealthChart } from '@/components/features/metric-charts';
import { SignalFeed } from '@/components/features/signal-feed';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { getDashboardSummary, getTopRiskCustomers } from '@/services/api';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [summary, risks] = await Promise.all([
    getDashboardSummary(),
    getTopRiskCustomers(3),
  ]);

  return (
    <PageWrapper className="py-6 space-y-6">
      {/* Header Area */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold">Workspace command center</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mt-0.5">Revenue Intelligence Cockpit</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-300 border border-emerald-400/20 bg-emerald-400/8 rounded-full px-3 py-1 font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Signals connected · Real-time sync active
        </div>
      </div>

      {/* Main double column cockpit layout */}
      <div className="grid gap-6 xl:grid-cols-[1fr_320px] items-start">
        
        {/* ── LEFT COLUMN: Metrics, Charts, Tables ── */}
        <div className="space-y-6 min-w-0">
          {/* Low profile KPI metrics strip */}
          <DashboardMetrics metrics={summary.metrics} />

          {/* Revenue Chart */}
          <AreaRevenueChart trends={summary.monthlyTrends} />

          {/* Core Customer Ledger Table */}
          <CustomerTable customers={summary.customers} />
        </div>

        {/* ── RIGHT COLUMN: Health snapshot, watchlist, actions, feeds ── */}
        <div className="space-y-6">
          {/* Donut chart snapshot */}
          <DonutHealthChart distribution={summary.healthDistribution} />

          {/* Sleek Priority Watchlist (no large cards) */}
          <div className="rounded-2xl border border-white/8 bg-[#0c0c0f]/40 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-400" />
                <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-bold">Priority Watchlist</h3>
              </div>
              <span className="font-mono-numeric text-[10px] border border-rose-400/20 bg-rose-400/8 text-rose-300 rounded px-1.5 py-0.5">
                {risks.length} at risk
              </span>
            </div>

            <div className="space-y-2.5">
              {risks.map((customer) => {
                const isCritical = customer.churnProbability >= 60;
                return (
                  <div key={customer.id} className="group relative rounded-xl border border-white/5 bg-black/25 p-3 hover:border-white/12 transition-all">
                    {/* Left indicator bar */}
                    <div className={`absolute left-0 inset-y-0 w-1 rounded-l-xl ${
                      isCritical ? 'bg-rose-500' : 'bg-amber-400'
                    }`} />

                    <div className="pl-1.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                          {customer.company}
                        </p>
                        <span className={`font-mono-numeric text-[9px] font-bold ${isCritical ? 'text-rose-400' : 'text-amber-400'}`}>
                          {customer.churnProbability}% risk
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-zinc-500">
                        <span>Owner: {customer.owner}</span>
                        <Link
                          href={`/dashboard/customer/${customer.id}`}
                          className="inline-flex items-center gap-0.5 text-emerald-400 hover:text-emerald-300 font-semibold"
                        >
                          Outreach <ArrowRight className="h-2.5 w-2.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI recommendations */}
          <AIInsights customers={risks} />

          {/* Live signal activity feed */}
          <SignalFeed />
        </div>

      </div>
    </PageWrapper>
  );
}
