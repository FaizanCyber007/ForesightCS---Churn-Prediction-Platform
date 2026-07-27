import { getCustomers, getInboxTasks } from '@/services/api';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { InboxTaskList } from '@/components/features/inbox-task-list';
import { TaskFormModal } from '@/components/features/task-form-modal';
import { CheckSquare } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function InboxPage() {
  const [tasks, customers] = await Promise.all([getInboxTasks(), getCustomers()]);

  const openTasksCount = tasks.filter((t) => t.status !== 'Completed').length;
  const criticalTasksCount = tasks.filter((t) => t.priority === 'Critical' && t.status !== 'Completed').length;

  return (
    <PageWrapper className="space-y-8 py-8 lg:py-10">
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Workflow</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-white flex items-center gap-3">
              <CheckSquare className="h-8 w-8 text-emerald-400" />
              Inbox &amp; Tasks
            </h1>
            <p className="mt-1 text-sm text-zinc-400 leading-relaxed max-w-xl">
              Manage your prioritized customer success workflow. Resolve system alerts and execute playbook tasks.
            </p>
          </div>
          <div className="flex items-start gap-6">
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-1">Open items</p>
              <p className="font-mono-numeric text-3xl font-bold text-white">
                {openTasksCount}
              </p>
              {criticalTasksCount > 0 && (
                <p className="text-[10px] text-rose-400 mt-1 uppercase tracking-wider font-semibold border border-rose-400/20 bg-rose-500/10 rounded px-1.5 py-0.5">
                  {criticalTasksCount} Critical
                </p>
              )}
            </div>
            <TaskFormModal customers={customers} />
          </div>
        </div>
      </section>

      <section>
        <InboxTaskList initialTasks={tasks} customers={customers} />
      </section>
    </PageWrapper>
  );
}
