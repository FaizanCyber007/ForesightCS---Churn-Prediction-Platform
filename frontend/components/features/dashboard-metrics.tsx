'use client';

import { ShieldAlert, BadgeDollarSign, Sparkles, TrendingUp } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

import { formatCompactNumber, formatPercent } from '@/lib/formatters';
import type { DashboardMetric } from '@/services/api';

const metricStyles: Record<string, { icon: typeof TrendingUp; color: string; bg: string }> = {
  'Customers at risk': { icon: ShieldAlert, color: 'text-rose-400', bg: 'from-rose-500/10 to-transparent' },
  'Retained ARR': { icon: BadgeDollarSign, color: 'text-emerald-400', bg: 'from-emerald-500/10 to-transparent' },
  'Expansion pipeline': { icon: TrendingUp, color: 'text-violet-400', bg: 'from-violet-500/10 to-transparent' },
  'Health score avg.': { icon: Sparkles, color: 'text-amber-400', bg: 'from-amber-500/10 to-transparent' },
};

export function DashboardMetrics({ metrics }: { metrics: DashboardMetric[] }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => {
        const style = metricStyles[metric.label] || { icon: TrendingUp, color: 'text-emerald-400', bg: 'from-emerald-500/10 to-transparent' };
        const Icon = style.icon;

        return (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.04 }}
            whileHover={reduceMotion ? undefined : { y: -2 }}
          >
            <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-[#0c0c0f]/50 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all hover:border-white/12">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-gradient-to-b ${style.bg} ${style.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold truncate">{metric.label}</p>
                </div>
                <div className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold shrink-0 ${
                  metric.trend === 'up' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
                }`}>
                  {metric.delta > 0 ? '+' : ''}{metric.delta}%
                </div>
              </div>

              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-xl font-bold tracking-tight text-white font-mono-numeric">
                  {metric.label.toLowerCase().includes('score')
                    ? formatPercent(metric.value)
                    : formatCompactNumber(metric.value)}
                </span>
                <span className="text-[10px] text-zinc-500 font-medium truncate">{metric.description}</span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
