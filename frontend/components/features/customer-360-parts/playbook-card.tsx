'use client';

import { CheckCircle2, Circle, Bot, AlertTriangle, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

import { GlassCard } from '@/components/ui/glass-card';
import type { Task } from '@/services/api';

const TYPE_ICON: Record<Task['type'], LucideIcon> = {
  Manual: ClipboardList,
  'Automated Playbook': Bot,
  'System Alert': AlertTriangle,
};

export function PlaybookCard({
  tasks,
  pendingTaskId,
  onToggleTask,
}: {
  tasks: Task[];
  pendingTaskId: string | null;
  onToggleTask: (task: Task) => void;
}) {
  const completedCount = tasks.filter((t) => t.status === 'Completed').length;
  const progressPct = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  return (
    <GlassCard className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            Playbooks
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            Active tasks
          </h2>
        </div>
        <div className="text-right">
          <p className="font-mono-numeric text-2xl font-semibold text-white">
            {completedCount}/{tasks.length}
          </p>
          <p className="text-xs text-zinc-500">completed</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-violet-400"
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {tasks.length === 0 ? (
        <p className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-zinc-500">
          No tasks for this customer yet.
        </p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const Icon = TYPE_ICON[task.type];
            const done = task.status === 'Completed';
            const isPending = pendingTaskId === task.id;
            return (
              <button
                key={task.id}
                onClick={() => onToggleTask(task)}
                disabled={isPending}
                className="flex w-full items-start gap-3 rounded-2xl border border-white/8 bg-black/20 p-3 text-left text-sm transition-colors hover:border-white/12 hover:bg-white/4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 disabled:opacity-50"
                aria-pressed={done}
              >
                {done ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-zinc-600" />
                )}
                <div className="flex flex-1 items-center justify-between gap-2">
                  <span className={done ? 'text-zinc-500 line-through' : 'text-zinc-300'}>
                    {task.title}
                  </span>
                  <Icon className="h-4 w-4 shrink-0 text-zinc-600" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
