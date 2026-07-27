'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { PlaybookFormModal } from '@/components/features/playbook-form-modal';
import type { Playbook } from '@/services/playbooks';

const statusConfig = {
  active: {
    label: 'Active',
    variant: 'success' as const,
    dot: 'bg-emerald-400',
  },
  inactive: {
    label: 'Inactive',
    variant: 'neutral' as const,
    dot: 'bg-zinc-500',
  },
};

export function PlaybookList({ playbooks }: { playbooks: Playbook[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <section className="space-y-3">
      {playbooks.map((playbook, i) => {
        const cfg = statusConfig[playbook.status] ?? statusConfig.inactive;
        const isExpanded = expandedId === playbook.id;
        const panelId = `playbook-panel-${playbook.id}`;
        const buttonId = `playbook-button-${playbook.id}`;

        return (
          <motion.div
            key={playbook.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
          >
            <div className={`relative rounded-2xl border p-5 transition-all ${
              isExpanded ? 'border-white/12 bg-white/4' : 'border-white/8 bg-white/2 hover:bg-white/3'
            }`}>
              <div className="absolute top-4 right-14 z-10">
                <PlaybookFormModal playbook={playbook} />
              </div>
              <button
                id={buttonId}
                aria-expanded={isExpanded}
                aria-controls={panelId}
                className="flex w-full items-start gap-4 rounded-xl text-left focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : playbook.id)}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-black/20 text-zinc-400 mt-0.5">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-semibold text-white text-base">{playbook.name}</p>
                    <Badge variant={cfg.variant} className="text-[10px] font-semibold">
                      <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </Badge>
                    {playbook.customersInPlay > 0 && (
                      <span className="rounded-full border border-amber-400/20 bg-amber-400/8 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                        {playbook.customersInPlay} active customer{playbook.customersInPlay !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400 leading-normal">{playbook.description}</p>
                  <p className="text-xs text-zinc-500 font-medium">
                    Trigger rule: <span className="text-zinc-300 font-semibold">{playbook.trigger}</span> · Last run:{' '}
                    {playbook.lastTriggered
                      ? new Date(playbook.lastTriggered).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Never'}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-lg flex items-center justify-center border border-white/5 hover:bg-white/5 transition-colors">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-zinc-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-zinc-500" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    id={panelId}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 pt-4 border-t border-white/8 space-y-4">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Playbook execution path</p>
                      <ol className="space-y-3 pl-1">
                        {playbook.steps.map((step, idx) => (
                          <li key={idx} className="flex items-center gap-3 text-sm text-zinc-300">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-400/8 text-xs font-bold text-emerald-300 font-mono-numeric">
                              {idx + 1}
                            </span>
                            <span className="leading-none">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}
    </section>
  );
}
