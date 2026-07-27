'use client';

import { useState } from 'react';
import { Bot, CheckCircle2, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

import { GlassCard } from '@/components/ui/glass-card';
import { cn } from '@/lib/cn';
import type { CustomerRecord } from '@/services/api';

type Priority = 'critical' | 'warning' | 'opportunity';

type Insight = {
  id: string;
  company: string;
  href: string;
  priority: Priority;
  action: string;
  details: string;
};

const priorityConfig: Record<Priority, { color: string; dot: string; border: string }> = {
  critical: { color: 'text-rose-300', dot: 'bg-rose-400', border: 'border-rose-500/20' },
  warning: { color: 'text-amber-300', dot: 'bg-amber-400', border: 'border-amber-500/20' },
  opportunity: { color: 'text-emerald-300', dot: 'bg-emerald-400', border: 'border-emerald-500/20' },
};

function toPriority(customer: CustomerRecord): Priority {
  if (customer.health === 'Critical') return 'critical';
  if (customer.health === 'At-Risk') return 'warning';
  return 'opportunity';
}

/** Derives a recommended action + supporting detail from a real Customer's own metrics. */
function buildInsight(customer: CustomerRecord): Insight {
  const priority = toPriority(customer);
  const acv = customer.annualContractValue.toLocaleString();

  const action =
    priority === 'critical'
      ? `Escalate executive outreach within 24h and loop in ${customer.owner} to reopen the adoption review.`
      : priority === 'warning'
        ? 'Trigger a proactive check-in and feature coaching before the next renewal checkpoint.'
        : 'Package the expansion motion now -- usage is strong and the customer is ready for commercial growth.';

  const details =
    priority === 'critical'
      ? `Churn risk at ${customer.churnProbability}%, NPS ${customer.netPromoterScore}, ${customer.supportTickets} open support signals. ACV at risk: $${acv}.`
      : priority === 'warning'
        ? `Engagement score ${customer.engagementScore}, NPS ${customer.netPromoterScore}. Revenue at risk: $${acv} ACV.`
        : `${customer.engagementScore}% engagement score, expansion potential flagged at ${customer.expansionPotential}%.`;

  return {
    id: customer.id,
    company: customer.company,
    href: `/dashboard/customer/${customer.id}`,
    priority,
    action,
    details,
  };
}

export function AIInsights({ customers }: { customers: CustomerRecord[] }) {
  const insights = customers.map(buildInsight);
  const [expanded, setExpanded] = useState<string | null>(insights[0]?.id ?? null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const visible = insights.filter((i) => !dismissed.has(i.id));

  return (
    <GlassCard className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-emerald-300">
          <Bot className="h-4 w-4" />
          <span className="text-sm uppercase tracking-[0.3em]">AI insights</span>
        </div>
        <span className="font-mono-numeric rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-zinc-400">
          {visible.length} active
        </span>
      </div>
      <div>
        <h3 className="text-xl font-semibold text-white">Recommended actions</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Ranked by churn pressure, commercial impact, and expansion upside.
        </p>
      </div>

      <div className="space-y-2">
        {visible.map((insight) => {
          const cfg = priorityConfig[insight.priority];
          const isExpanded = expanded === insight.id;
          const isDone = completed.has(insight.id);

          return (
            <div
              key={insight.id}
              className={cn(
                'rounded-3xl border bg-black/25 transition-colors',
                cfg.border,
                isDone && 'opacity-60'
              )}
            >
              <button
                className="flex w-full items-start gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 rounded-3xl"
                onClick={() => setExpanded(isExpanded ? null : insight.id)}
                aria-expanded={isExpanded}
              >
                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', cfg.dot)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn('font-medium', isDone ? 'text-zinc-500 line-through' : 'text-white')}>
                      {insight.company}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-zinc-400 line-clamp-2">{insight.action}</p>
                </div>
                {isExpanded ? (
                  <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                ) : (
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                )}
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-white/8 px-4 pb-4 pt-3">
                      <p className="text-sm text-zinc-400 mb-3">{insight.details}</p>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={insight.href}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-200 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          Open customer <ExternalLink className="h-3 w-3" />
                        </Link>
                        <button
                          onClick={() => {
                            setCompleted((prev) => {
                              const next = new Set(prev);
                              if (isDone) next.delete(insight.id);
                              else next.add(insight.id);
                              return next;
                            });
                          }}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50',
                            isDone
                              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                              : 'border-white/10 bg-white/5 text-zinc-400 hover:border-emerald-400/20 hover:text-emerald-300'
                          )}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {isDone ? 'Marked done' : 'Mark done'}
                        </button>
                        <button
                          onClick={() => {
                            setDismissed((prev) => new Set([...prev, insight.id]));
                          }}
                          className="inline-flex items-center rounded-xl border border-white/5 bg-white/3 px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:border-rose-500/20 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {visible.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            <p className="font-medium text-white">All caught up!</p>
            <p className="text-sm text-zinc-500">No pending AI recommendations.</p>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/8 p-4 text-sm text-emerald-100">
        <Bot className="mb-0.5 mr-1.5 inline h-3.5 w-3.5 text-emerald-300" />
        Model confidence is strong across the top risk customers this week.
      </div>
    </GlassCard>
  );
}
