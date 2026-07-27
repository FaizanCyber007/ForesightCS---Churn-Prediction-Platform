'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Gauge, Trash2, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { deleteHealthRuleAction } from '@/app/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { useToast } from '@/components/ui/toast';
import type { HealthRule } from '@/services/rules';

export function RuleList({ rules: initialRules }: { rules: HealthRule[] }) {
  const [rules, setRules] = useState(initialRules);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  async function handleDelete(rule: HealthRule) {
    setPendingId(rule.id);
    try {
      await deleteHealthRuleAction(rule.id);
      setRules((current) => current.filter((r) => r.id !== rule.id));
      toast({ title: 'Rule removed', description: `${rule.name} no longer affects scoring.`, tone: 'info' });
      router.refresh();
    } catch {
      toast({ title: 'Could not delete rule', tone: 'error' });
    } finally {
      setPendingId(null);
    }
  }

  if (rules.length === 0) {
    return (
      <GlassCard className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-black/20 text-zinc-500">
          <Zap className="h-5 w-5" />
        </div>
        <p className="text-sm font-semibold text-white">No health rules yet</p>
        <p className="max-w-sm text-xs text-zinc-500 leading-normal">
          Define your first weighted telemetry signal to start scoring customer churn risk.
        </p>
      </GlassCard>
    );
  }

  return (
    <section className="space-y-3">
      {rules.map((rule, i) => (
        <motion.div
          key={rule.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.05 }}
        >
          <div className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.02] p-5 transition-all hover:bg-white/[0.03]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-black/20 text-zinc-400">
              <Gauge className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-semibold text-white text-base">{rule.name}</p>
                <Badge variant={rule.isActive ? 'success' : 'neutral'} className="text-[10px] font-semibold">
                  <span
                    className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${rule.isActive ? 'bg-emerald-400' : 'bg-zinc-500'}`}
                  />
                  {rule.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <Badge variant="accent" className="text-[10px] font-semibold">
                  {rule.metricTypeLabel}
                </Badge>
              </div>
              <p className="text-xs text-zinc-500 font-medium">
                Threshold <span className="text-zinc-300 font-semibold">{rule.threshold}</span> · Weight{' '}
                <span className="text-zinc-300 font-semibold">-{rule.weight} pts</span>
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
              aria-label={`Delete ${rule.name}`}
              disabled={pendingId === rule.id}
              onClick={() => handleDelete(rule)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      ))}
    </section>
  );
}
