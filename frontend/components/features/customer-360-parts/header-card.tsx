'use client';

import { Calendar, ExternalLink, Mail, RefreshCw } from 'lucide-react';

import { GlassCard } from '@/components/ui/glass-card';
import { formatCurrency } from '@/lib/formatters';
import type { CustomerDetail } from '@/services/api';
import { HealthGauge } from '@/components/features/customer-360-parts/health-gauge';

export function CustomerHeaderCard({
  customer,
  currentHealth,
  currentRisk,
  currentScore,
  isRecalculating,
  onRecalculate,
}: {
  customer: CustomerDetail;
  currentHealth: CustomerDetail['health'];
  currentRisk: number;
  currentScore: number;
  isRecalculating: boolean;
  onRecalculate: () => void;
}) {
  return (
    <GlassCard className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-zinc-500">
              Customer 360
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              {customer.company}
            </h1>
            <p className="mt-1 text-zinc-400">
              {customer.name} · {customer.segment} · Owned by{' '}
              <span className="text-zinc-200">{customer.owner}</span>
            </p>
          </div>
          {/* Health can only change via the backend HealthScoreEngine (rule evaluation) */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              disabled={isRecalculating}
              onClick={onRecalculate}
              className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 text-xs font-semibold px-3 py-1.5 hover:bg-white/10 active:scale-95 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isRecalculating ? 'animate-spin' : ''}`} />
              {isRecalculating ? 'Recalculating...' : 'Recalculate Health Score'}
            </button>
          </div>
        </div>
        <HealthGauge score={currentScore} health={currentHealth} />
      </div>

      {/* Key metrics row */}
      <div className="grid gap-3 md:grid-cols-5">
        {[
          { label: 'MRR', value: formatCurrency(customer.monthlyRecurringRevenue) },
          { label: 'ACV', value: formatCurrency(customer.annualContractValue) },
          { label: 'Billing', value: currentHealth === 'Critical' ? 'Past Due' : 'Current' },
          { label: 'Churn risk', value: `${currentRisk}%` },
          { label: 'NPS', value: customer.netPromoterScore > 0 ? `+${customer.netPromoterScore}` : String(customer.netPromoterScore) },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-3xl border border-white/8 bg-black/20 p-4"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">{label}</p>
            <p className="mt-2 font-mono-numeric text-xl font-semibold text-white">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Renewal & contact */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-4 py-2">
          <Calendar className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-zinc-400">Renewal:</span>
          <span className="text-white">
            {new Date(customer.renewalDate).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
        <a
          href={`mailto:${customer.customerOwnerEmail}`}
          className="flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-4 py-2 text-zinc-400 transition-colors hover:text-white"
        >
          <Mail className="h-3.5 w-3.5" />
          {customer.customerOwnerEmail}
          <ExternalLink className="h-3 w-3 text-zinc-600" />
        </a>
      </div>
    </GlassCard>
  );
}
