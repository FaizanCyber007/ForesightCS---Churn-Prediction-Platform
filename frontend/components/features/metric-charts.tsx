'use client';

import { ResponsiveContainer, AreaChart, XAxis, YAxis, Tooltip, Area, PieChart, Pie, Cell } from 'recharts';
import type { HealthDistribution, MonthlyTrend } from '@/services/api';

const COLORS: Record<string, string> = {
  Healthy: '#34d399',
  'At-Risk': '#f59e0b',
  Critical: '#fb7185',
};

// Custom tooltip for area chart
function AreaTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0c0c0f] px-3 py-2 shadow-2xl">
      <p className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-xs">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-zinc-400">{p.name}</span>
          <span className="ml-auto font-mono-numeric font-semibold text-white">{p.value}k</span>
        </div>
      ))}
    </div>
  );
}

/**
 * 📈 Retained vs Expansion ARR Area Chart component
 */
export function AreaRevenueChart({ trends }: { trends: MonthlyTrend[] }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-[#0c0c0f]/40 p-5 backdrop-blur-2xl shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
      <div className="pointer-events-none absolute -top-16 left-1/2 h-32 w-64 -translate-x-1/2 rounded-full bg-emerald-400/5 blur-2xl" />
      <div className="relative">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] uppercase tracking-[0.25em] text-zinc-500 font-semibold">Revenue momentum</p>
            <h3 className="text-base font-bold text-white mt-0.5">Retained vs Expansion ARR</h3>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-[9px] font-semibold text-emerald-300">Live feed</span>
          </div>
        </div>

        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trends} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="gradRetained" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradExpansion" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" stroke="#3f3f46" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#3f3f46" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}k`} width={32} />
              <Tooltip content={<AreaTooltip />} />
              <Area type="monotone" dataKey="retainedRevenue" name="Retained ARR" stroke="#34d399" strokeWidth={1.5} fill="url(#gradRetained)" dot={false} />
              <Area type="monotone" dataKey="expansionRevenue" name="Expansion ARR" stroke="#a78bfa" strokeWidth={1.5} fill="url(#gradExpansion)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 flex items-center gap-4 text-[10px] font-semibold text-zinc-500">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-4 rounded-full bg-emerald-400/80" />
            Retained ARR
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-4 rounded-full bg-violet-400/80" />
            Expansion ARR
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 🍩 Health Snapshot Donut Chart component
 */
export function DonutHealthChart({ distribution }: { distribution: HealthDistribution[] }) {
  const total = distribution.reduce((s, d) => s + Number(d.value), 0);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-[#0c0c0f]/40 p-5 backdrop-blur-2xl shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
      <div className="pointer-events-none absolute -bottom-12 right-0 h-32 w-32 rounded-full bg-violet-400/5 blur-2xl" />
      <div className="relative flex flex-col gap-4">
        <div>
          <p className="text-[9px] uppercase tracking-[0.25em] text-zinc-500 font-semibold">Health snapshot</p>
          <h3 className="text-base font-bold text-white mt-0.5">Portfolio Mix</h3>
        </div>

        <div className="relative" style={{ height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={distribution}
                cx="50%"
                cy="50%"
                innerRadius={44}
                outerRadius={64}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
                startAngle={90}
                endAngle={-270}
              >
                {distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.label] ?? entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0c0c0f',
                  borderColor: 'rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  fontSize: 10,
                }}
                itemStyle={{ color: '#e4e4e7' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="font-mono-numeric text-xl font-bold text-white leading-none">{total}</p>
            <p className="text-[8px] text-zinc-500 mt-0.5">customers</p>
          </div>
        </div>

        <div className="space-y-2">
          {distribution.map((item) => {
            const pct = total > 0 ? Math.round((Number(item.value) / total) * 100) : 0;
            const color = COLORS[item.label] ?? item.color;
            return (
              <div key={item.label}>
                <div className="mb-0.5 flex items-center justify-between text-[10px] font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-zinc-400">{item.label}</span>
                  </div>
                  <span className="font-mono-numeric text-white">{item.value} ({pct}%)</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Keep backward compatibility wrapper
export function MetricCharts({
  trends,
  distribution,
}: {
  trends: MonthlyTrend[];
  distribution: HealthDistribution[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <AreaRevenueChart trends={trends} />
      <DonutHealthChart distribution={distribution} />
    </div>
  );
}
