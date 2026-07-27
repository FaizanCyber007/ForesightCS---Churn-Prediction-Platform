'use client';

import { useState } from 'react';
import { CheckSquare, Circle, PlayCircle, AlertCircle, Calendar, MessageSquare, Filter, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import type { CustomerRecord, Task } from '@/services/api';
import { useToast } from '@/components/ui/toast';
import { TaskFormModal } from '@/components/features/task-form-modal';

export function InboxTaskList({
  initialTasks,
  customers,
}: {
  initialTasks: Task[];
  customers: Pick<CustomerRecord, 'id' | 'company'>[];
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [syncedInitialTasks, setSyncedInitialTasks] = useState(initialTasks);
  const [filter, setFilter] = useState<'All' | 'Open' | 'Completed'>('Open');
  const [priorityFilter, setPriorityFilter] = useState<'All' | Task['priority']>('All');
  const { toast } = useToast();

  // Re-sync from the server-fetched list after a create/edit modal calls
  // router.refresh() -- this component keeps its own `tasks` state for
  // optimistic status toggling, so a fresh `initialTasks` prop wouldn't
  // otherwise be picked up (useState only reads its initializer once).
  // Adjusting state during render (React's documented pattern for this,
  // see "Adjusting state when a prop changes") instead of an effect --
  // this repo's eslint config flags setState-in-effect as cascading-render risk.
  if (initialTasks !== syncedInitialTasks) {
    setSyncedInitialTasks(initialTasks);
    setTasks(initialTasks);
  }

  const handleToggleStatus = async (task: Task) => {
    const newStatus = task.status === 'Completed' ? 'Open' : 'Completed';
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    
    try {
      const { updateTaskStatusAction } = await import('@/app/actions');
      await updateTaskStatusAction(task.id, newStatus);
      if (newStatus === 'Completed') {
        toast({ title: 'Task Completed', description: 'Marked as completed successfully.', tone: 'success' });
      }
    } catch {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t));
      toast({ title: 'Error', description: 'Failed to update task status.', tone: 'error' });
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
    if (filter === 'All') return true;
    if (filter === 'Completed') return t.status === 'Completed';
    return t.status !== 'Completed';
  });

  const getPriorityColor = (priority: Task['priority']) => {
    switch(priority) {
      case 'Critical': return 'text-rose-400 bg-rose-500/10 border-rose-400/20';
      case 'High': return 'text-amber-400 bg-amber-500/10 border-amber-400/20';
      case 'Medium': return 'text-blue-400 bg-blue-500/10 border-blue-400/20';
      case 'Low': return 'text-zinc-400 bg-zinc-500/10 border-zinc-400/20';
    }
  };

  const getTypeIcon = (type: Task['type']) => {
    switch(type) {
      case 'Automated Playbook': return <PlayCircle className="h-3 w-3" />;
      case 'System Alert': return <AlertCircle className="h-3 w-3" />;
      case 'Manual': return <MessageSquare className="h-3 w-3" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex bg-black/20 p-1 border border-white/5 rounded-xl">
          {(['Open', 'Completed', 'All'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filter === f ? 'bg-white/10 text-white shadow' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl cursor-pointer">
          <Filter className="h-3.5 w-3.5" />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as 'All' | Task['priority'])}
            className="appearance-none bg-transparent text-inherit focus:outline-none cursor-pointer"
            aria-label="Filter by priority"
          >
            <option value="All" className="bg-[#0c0d0f]">All priorities</option>
            <option value="Critical" className="bg-[#0c0d0f]">Critical</option>
            <option value="High" className="bg-[#0c0d0f]">High</option>
            <option value="Medium" className="bg-[#0c0d0f]">Medium</option>
            <option value="Low" className="bg-[#0c0d0f]">Low</option>
          </select>
        </label>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {filteredTasks.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center text-zinc-500 text-sm">
              No tasks found in this view.
            </motion.div>
          )}
          {filteredTasks.map(task => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <GlassCard className={`p-4 flex gap-4 transition-colors ${task.status === 'Completed' ? 'opacity-50' : 'hover:border-emerald-400/20'}`}>
                <button 
                  onClick={() => handleToggleStatus(task)}
                  className="mt-1 h-5 w-5 shrink-0 flex items-center justify-center text-zinc-500 hover:text-emerald-400 transition-colors focus:outline-none"
                >
                  {task.status === 'Completed' ? <CheckSquare className="h-5 w-5 text-emerald-400" /> : <Circle className="h-5 w-5" />}
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className={`text-sm font-semibold ${task.status === 'Completed' ? 'line-through text-zinc-500' : 'text-white'}`}>
                        {task.title}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{task.description}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider border rounded px-2 py-0.5 ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <TaskFormModal task={task} customers={customers} />
                    </div>
                  </div>
                  
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                    {task.relatedCustomer && (
                      <div className="flex items-center gap-1 text-emerald-300 font-semibold cursor-pointer hover:underline">
                        <ArrowRight className="h-3 w-3" /> {task.relatedCustomer}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 border-l border-white/10 pl-3">
                      {getTypeIcon(task.type)} {task.type}
                    </div>
                    <div className="flex items-center gap-1.5 border-l border-white/10 pl-3">
                      <Calendar className="h-3 w-3" /> Due {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
