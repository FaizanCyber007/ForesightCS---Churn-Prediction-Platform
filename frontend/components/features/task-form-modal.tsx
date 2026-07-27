'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { PencilLine, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { createTaskAction, updateTaskAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { taskSchema, type TaskFormValues } from '@/lib/schemas';
import type { CustomerRecord, Task } from '@/services/api';

const PRIORITY_OPTIONS = [
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Critical', label: 'Critical' },
];

const STATUS_OPTIONS = [
  { value: 'Open', label: 'Open' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Completed', label: 'Completed' },
];

const TYPE_OPTIONS = [
  { value: 'Manual', label: 'Manual' },
  { value: 'Automated Playbook', label: 'Automated Playbook' },
  { value: 'System Alert', label: 'System Alert' },
];

const emptyValues: TaskFormValues = {
  title: '',
  description: '',
  priority: 'Medium',
  status: 'Open',
  due_date: '',
  type: 'Manual',
  customer: null,
};

function toFormValues(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    due_date: task.dueDate,
    type: task.type,
    customer: task.customerId,
  };
}

export function TaskFormModal({
  task,
  customers,
}: {
  task?: Task;
  customers: Pick<CustomerRecord, 'id' | 'company'>[];
}) {
  const isEdit = Boolean(task);
  const initialValues = task ? toFormValues(task) : emptyValues;

  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema) as never,
    defaultValues: initialValues,
  });

  function closeAndReset(next: boolean) {
    setOpen(next);
    if (!next) form.reset(initialValues);
  }

  async function onSubmit(values: TaskFormValues) {
    const normalized = { ...values, customer: values.customer || null };
    const result =
      isEdit && task ? await updateTaskAction(task.id, normalized) : await createTaskAction(normalized);

    if (!result.success) {
      let hadFieldMatch = false;
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        if (field in initialValues) {
          form.setError(field as keyof TaskFormValues, { message: messages[0] });
          hadFieldMatch = true;
        }
      }
      const topLevel = result.fieldErrors.non_field_errors?.[0];
      toast({
        title: isEdit ? 'Could not update task' : 'Could not create task',
        description: topLevel ?? (hadFieldMatch ? 'Check the highlighted fields.' : undefined),
        tone: 'error',
      });
      return;
    }

    toast({
      title: isEdit ? 'Task updated' : 'Task created',
      description: result.data.title,
      tone: 'success',
    });
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      {isEdit ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 shrink-0 p-0"
          aria-label="Edit task"
          onClick={(event) => {
            event.stopPropagation();
            setOpen(true);
          }}
        >
          <PencilLine className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <Button variant="brand" size="sm" className="h-10 text-xs gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New task
        </Button>
      )}

      <Modal
        open={open}
        onOpenChange={closeAndReset}
        title={isEdit ? 'Edit task' : 'New task'}
        description="Create or update a customer success action item."
      >
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" error={form.formState.errors.title?.message} className="sm:col-span-2">
              <Input className="h-10 text-sm" placeholder="Follow up on renewal" {...form.register('title')} />
            </Field>
            <Field
              label="Description"
              error={form.formState.errors.description?.message}
              className="sm:col-span-2"
            >
              <Textarea
                className="min-h-[80px] text-sm"
                placeholder="What needs to happen and why."
                {...form.register('description')}
              />
            </Field>
            <Field label="Priority" error={form.formState.errors.priority?.message}>
              <Select options={PRIORITY_OPTIONS} {...form.register('priority')} />
            </Field>
            <Field label="Status" error={form.formState.errors.status?.message}>
              <Select options={STATUS_OPTIONS} {...form.register('status')} />
            </Field>
            <Field label="Due date" error={form.formState.errors.due_date?.message}>
              <Input className="h-10 text-sm" type="date" {...form.register('due_date')} />
            </Field>
            <Field label="Type" error={form.formState.errors.type?.message}>
              <Select options={TYPE_OPTIONS} {...form.register('type')} />
            </Field>
            <Field
              label="Related customer (optional)"
              error={form.formState.errors.customer?.message}
              className="sm:col-span-2"
            >
              <Select
                {...form.register('customer')}
                options={[
                  { value: '', label: 'No related customer' },
                  ...customers.map((c) => ({ value: c.id, label: c.company })),
                ]}
              />
            </Field>
          </div>

          <div className="flex flex-wrap justify-end gap-2.5 pt-2 border-t border-white/5">
            <Button type="button" variant="secondary" className="h-10 text-xs" onClick={() => closeAndReset(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" className="h-10 text-xs" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? isEdit
                  ? 'Saving…'
                  : 'Creating…'
                : isEdit
                  ? 'Save changes'
                  : 'Create task'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('space-y-1.5 block', className)}>
      <span className="text-xs font-semibold text-zinc-400">{label}</span>
      {children}
      {error ? (
        <p role="alert" className="text-[10px] font-semibold text-rose-400">
          {error}
        </p>
      ) : null}
    </label>
  );
}
