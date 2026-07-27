'use client';

import { GlassCard } from '@/components/ui/glass-card';
import type { CustomerDetail } from '@/services/api';
import { SignalBar } from '@/components/features/customer-360-parts/signal-bar';

export function TelemetryCard({
  customer,
  currentScore,
}: {
  customer: CustomerDetail;
  currentScore: number;
}) {
  return (
    <GlassCard className="space-y-5">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Telemetry
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">
          Engagement signals &amp; adoption depth
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(customer.technologySignals).map(([key, value]) => (
          <div
            key={key}
            className="rounded-3xl border border-white/8 bg-white/4 p-4"
          >
            <p className="text-sm capitalize text-zinc-500">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </p>
            <p className="mt-2 font-mono-numeric text-2xl font-semibold text-white">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Signal breakdown bars */}
      <div className="space-y-3 rounded-3xl border border-white/8 bg-black/20 p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
          Health signal breakdown
        </p>
        <SignalBar label="Product adoption" value={currentScore} color="#34d399" />
        <SignalBar label="Support intensity" value={Math.min(100, customer.supportTickets * 9)} color="#f59e0b" />
        <SignalBar label="Expansion potential" value={customer.expansionPotential} color="#a78bfa" />
      </div>
    </GlassCard>
  );
}
