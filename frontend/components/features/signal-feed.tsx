'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, AlertTriangle, CheckCircle2, CreditCard, TrendingDown, Zap, type LucideIcon } from 'lucide-react';

import { GlassCard } from '@/components/ui/glass-card';
import { cn } from '@/lib/cn';

type SignalCategory = 'churn' | 'billing' | 'health' | 'expansion' | 'support';

interface SignalEvent {
  id: string;
  timestamp: Date;
  company: string;
  message: string;
  category: SignalCategory;
  severity: 'low' | 'medium' | 'high';
}

const categoryConfig: Record<
  SignalCategory,
  { icon: LucideIcon; color: string; bg: string; border: string }
> = {
  churn: {
    icon: TrendingDown,
    color: 'text-rose-300',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
  },
  billing: {
    icon: CreditCard,
    color: 'text-amber-300',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  health: {
    icon: Activity,
    color: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  expansion: {
    icon: Zap,
    color: 'text-violet-300',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
  support: {
    icon: AlertTriangle,
    color: 'text-orange-300',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
  },
};

const SIGNAL_POOL: Omit<SignalEvent, 'id' | 'timestamp'>[] = [
  { company: 'Atlas Retail', message: 'Login drop detected — 28% below 14-day average', category: 'churn', severity: 'high' },
  { company: 'Northstar Health', message: 'Invoice overdue by 7 days — follow-up required', category: 'billing', severity: 'medium' },
  { company: 'Summit Ops', message: 'Feature adoption crossed 90% — expansion signal', category: 'expansion', severity: 'low' },
  { company: 'Orbit Finance', message: 'NPS response: 6 — below risk threshold', category: 'health', severity: 'medium' },
  { company: 'Acme Cloud', message: 'Renewal confirmed — ARR retained at $216k', category: 'health', severity: 'low' },
  { company: 'Bluepine Studio', message: 'Support ticket spike: 3 P2 tickets in 48h', category: 'support', severity: 'high' },
  { company: 'Atlas Retail', message: 'API usage dropped 62% vs. prior week', category: 'churn', severity: 'high' },
  { company: 'Northstar Health', message: 'Engagement score fell to 54 — At-Risk threshold', category: 'health', severity: 'medium' },
  { company: 'Summit Ops', message: 'New seat request from enterprise admin team', category: 'expansion', severity: 'low' },
  { company: 'Orbit Finance', message: 'QBR scheduled — positive signal for renewal', category: 'health', severity: 'low' },
];

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

/** Simulated real-time portfolio signal feed */
export function SignalFeed() {
  const [signals, setSignals] = useState<SignalEvent[]>(() => {
    // Seed with initial events
    return SIGNAL_POOL.slice(0, 4).map((s, i) => ({
      ...s,
      id: `initial-${i}`,
      timestamp: new Date(Date.now() - (i + 1) * 45000),
    }));
  });
  const [tick, setTick] = useState(0);
  const idxRef = useRef(4); // next signal index in pool

  // Force re-render every 10s to update relative times
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  // Inject a new signal every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const poolItem = SIGNAL_POOL[idxRef.current % SIGNAL_POOL.length];
      idxRef.current += 1;
      const newSignal: SignalEvent = {
        ...poolItem,
        id: `sig-${Date.now()}`,
        timestamp: new Date(),
      };
      setSignals((prev) => [newSignal, ...prev].slice(0, 8));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <GlassCard className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-emerald-300">
            <Activity className="h-4 w-4" />
            <p className="text-sm uppercase tracking-[0.3em]">Portfolio signals</p>
          </div>
          <h3 className="mt-2 text-xl font-semibold text-white">Live event feed</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
          streaming
        </div>
      </div>

      <div
        className="relative max-h-[320px] space-y-2 overflow-y-auto pr-1"
        aria-live="polite"
        aria-label="Portfolio signal feed"
        // suppress lint — tick only used to force re-render
        data-tick={tick}
      >
        <AnimatePresence initial={false}>
          {signals.map((signal) => {
            const cfg = categoryConfig[signal.category];
            const Icon = cfg.icon;
            return (
              <motion.div
                key={signal.id}
                layout
                initial={{ opacity: 0, height: 0, y: -8 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <div
                  className={cn(
                    'flex items-start gap-3 overflow-hidden rounded-2xl border p-3 text-sm',
                    cfg.bg,
                    cfg.border
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                      cfg.bg,
                      cfg.border,
                      'border'
                    )}
                  >
                    <Icon className={cn('h-3.5 w-3.5', cfg.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{signal.company}</span>
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-wider',
                          signal.severity === 'high'
                            ? 'bg-rose-500/20 text-rose-300'
                            : signal.severity === 'medium'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                        )}
                      >
                        {signal.severity}
                      </span>
                    </div>
                    <p className="mt-0.5 text-zinc-400">{signal.message}</p>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-600">
                    {formatRelativeTime(signal.timestamp)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/8 px-4 py-3 text-xs text-emerald-200">
        <CheckCircle2 className="mb-0.5 mr-1.5 inline h-3.5 w-3.5 text-emerald-300" />
        Model is monitoring {signals.length > 0 ? 6 : 0} customers across{' '}
        {Object.keys(categoryConfig).length} signal categories in real time.
      </div>
    </GlassCard>
  );
}
