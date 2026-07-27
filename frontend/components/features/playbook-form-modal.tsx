'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { PencilLine, Plus, X, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { createPlaybookAction, updatePlaybookAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { playbookSchema, type PlaybookFormValues } from '@/lib/schemas';
import type { Playbook } from '@/services/playbooks';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const emptyValues: PlaybookFormValues = {
  name: '',
  description: '',
  trigger: '',
  status: 'active',
  steps: [''],
};

function toFormValues(playbook: Playbook): PlaybookFormValues {
  return {
    name: playbook.name,
    description: playbook.description,
    trigger: playbook.trigger,
    status: playbook.status,
    steps: playbook.steps.length > 0 ? playbook.steps : [''],
  };
}

export function PlaybookFormModal({ playbook }: { playbook?: Playbook }) {
  const isEdit = Boolean(playbook);
  const initialValues = playbook ? toFormValues(playbook) : emptyValues;

  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<string[]>(initialValues.steps);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<PlaybookFormValues>({
    resolver: zodResolver(playbookSchema) as never,
    defaultValues: initialValues,
  });

  function closeAndReset(next: boolean) {
    setOpen(next);
    if (!next) {
      form.reset(initialValues);
      setSteps(initialValues.steps);
    }
  }

  function setStepsAndForm(next: string[]) {
    setSteps(next);
    form.setValue('steps', next, { shouldValidate: form.formState.isSubmitted });
  }

  async function onSubmit(values: PlaybookFormValues) {
    const result =
      isEdit && playbook
        ? await updatePlaybookAction(playbook.id, values)
        : await createPlaybookAction(values);

    if (!result.success) {
      let hadFieldMatch = false;
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        if (field in initialValues) {
          form.setError(field as keyof PlaybookFormValues, { message: messages[0] });
          hadFieldMatch = true;
        }
      }
      const topLevel = result.fieldErrors.non_field_errors?.[0];
      toast({
        title: isEdit ? 'Could not update playbook' : 'Could not create playbook',
        description: topLevel ?? (hadFieldMatch ? 'Check the highlighted fields.' : undefined),
        tone: 'error',
      });
      return;
    }

    toast({
      title: isEdit ? 'Playbook updated' : 'Playbook created',
      description: `${result.data.name} is now ${result.data.status === 'active' ? 'active' : 'saved as inactive'}.`,
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
          className="h-8 px-2.5 text-xs gap-1.5"
          onClick={() => setOpen(true)}
        >
          <PencilLine className="h-3.5 w-3.5" />
          Edit
        </Button>
      ) : (
        <Button variant="brand" size="sm" className="h-10 text-xs gap-1.5" onClick={() => setOpen(true)}>
          <Zap className="h-4 w-4" /> New playbook
        </Button>
      )}

      <Modal
        open={open}
        onOpenChange={closeAndReset}
        title={isEdit ? 'Edit playbook' : 'New playbook'}
        description="Define an automated retention play triggered by a churn signal condition."
      >
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Playbook name" error={form.formState.errors.name?.message}>
              <Input className="h-10 text-sm" placeholder="Dunning recovery" {...form.register('name')} />
            </Field>
            <Field label="Status" error={form.formState.errors.status?.message}>
              <Select options={STATUS_OPTIONS} {...form.register('status')} />
            </Field>
            <Field
              label="Trigger condition"
              error={form.formState.errors.trigger?.message}
              className="sm:col-span-2"
            >
              <Input
                className="h-10 text-sm"
                placeholder="Health score drops below 40"
                {...form.register('trigger')}
              />
            </Field>
            <Field
              label="Description"
              error={form.formState.errors.description?.message}
              className="sm:col-span-2"
            >
              <Textarea
                className="min-h-[80px] text-sm"
                placeholder="What this play does and when it fires."
                {...form.register('description')}
              />
            </Field>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Execution steps</span>
              <button
                type="button"
                onClick={() => setStepsAndForm([...steps, ''])}
                className="flex items-center gap-1 text-[11px] font-semibold text-emerald-300 hover:text-emerald-200"
              >
                <Plus className="h-3.5 w-3.5" /> Add step
              </button>
            </div>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/8 bg-black/20 text-xs font-bold text-zinc-400 font-mono-numeric">
                    {index + 1}
                  </span>
                  <Input
                    className="h-9 text-sm"
                    placeholder={`Step ${index + 1}`}
                    value={step}
                    onChange={(event) => {
                      const next = [...steps];
                      next[index] = event.target.value;
                      setStepsAndForm(next);
                    }}
                  />
                  <button
                    type="button"
                    aria-label={`Remove step ${index + 1}`}
                    disabled={steps.length <= 1}
                    onClick={() => {
                      const next = steps.filter((_, i) => i !== index);
                      setStepsAndForm(next.length > 0 ? next : ['']);
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            {form.formState.errors.steps ? (
              <p role="alert" className="text-[10px] font-semibold text-rose-400">
                {form.formState.errors.steps.message ?? form.formState.errors.steps.root?.message}
              </p>
            ) : null}
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
                  : 'Create playbook'}
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
