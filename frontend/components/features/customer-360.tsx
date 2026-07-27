'use client';

import { useState } from 'react';

import { useToast } from '@/components/ui/toast';
import type { CustomerDetail, Task } from '@/services/api';
import { CustomerContacts } from '@/components/features/customer-contacts';
import { CustomerHeaderCard } from '@/components/features/customer-360-parts/header-card';
import { TelemetryCard } from '@/components/features/customer-360-parts/telemetry-card';
import { PlaybookCard } from '@/components/features/customer-360-parts/playbook-card';
import { TimelineCard } from '@/components/features/customer-360-parts/timeline-card';
import { NotesCard } from '@/components/features/customer-360-parts/notes-card';

export function Customer360({
  customer,
  tasks: initialTasks,
}: {
  customer: CustomerDetail;
  tasks: Task[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const { toast } = useToast();

  async function toggleTask(task: Task) {
    const nextStatus: Task['status'] = task.status === 'Completed' ? 'Open' : 'Completed';
    setPendingTaskId(task.id);
    const previous = tasks;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    try {
      const { updateTaskStatusAction } = await import('@/app/actions');
      await updateTaskStatusAction(task.id, nextStatus, customer.id);
    } catch (e) {
      setTasks(previous);
      const err = e as Error;
      toast({
        title: 'Could not update task',
        description: err.message || 'An error occurred while updating the task.',
        tone: 'error',
      });
    } finally {
      setPendingTaskId(null);
    }
  }

  const [currentHealth, setCurrentHealth] = useState(customer.health);
  const [currentRisk, setCurrentRisk] = useState(customer.churnProbability);
  const [currentScore, setCurrentScore] = useState(customer.engagementScore);
  const [isRecalculating, setIsRecalculating] = useState(false);

  async function handleRecalculate() {
    setIsRecalculating(true);
    try {
      const { recalculateHealthScoreAction } = await import('@/app/actions');
      const updated = await recalculateHealthScoreAction(customer.id);
      setCurrentScore(updated.engagementScore);
      setCurrentHealth(updated.health);
      setCurrentRisk(updated.churnProbability);
      toast({
        title: 'Health Score Recalculated',
        description: `${customer.company} is now scored ${updated.engagementScore} (${updated.health}).`,
        tone: updated.health === 'Critical' ? 'error' : 'success',
      });
    } catch (e) {
      const err = e as Error;
      toast({
        title: 'Recalculation Failed',
        description: err.message || 'An error occurred while recalculating the health score.',
        tone: 'error',
      });
      console.error(e);
    } finally {
      setIsRecalculating(false);
    }
  }

  return (
    <div className="space-y-6">
      <CustomerHeaderCard
        customer={customer}
        currentHealth={currentHealth}
        currentRisk={currentRisk}
        currentScore={currentScore}
        isRecalculating={isRecalculating}
        onRecalculate={handleRecalculate}
      />

      {/* Telemetry + Playbook */}
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <TelemetryCard customer={customer} currentScore={currentScore} />
        <PlaybookCard tasks={tasks} pendingTaskId={pendingTaskId} onToggleTask={toggleTask} />
      </div>

      {/* Timeline + Notes */}
      <div className="grid gap-4 xl:grid-cols-2">
        <TimelineCard timeline={customer.timeline} />
        <NotesCard customerId={customer.id} notes={customer.notes} />
        <CustomerContacts customerId={customer.id} contacts={customer.contacts} />
      </div>
    </div>
  );
}
