'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { HelpCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { createHealthRuleAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Select, type SelectOption } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { healthRuleSchema, type HealthRuleFormValues } from '@/lib/schemas';
import type { MetricTypeOption } from '@/services/rules';

const defaultValues: HealthRuleFormValues = {
  name: '',
  metric_type: '',
  threshold: 0,
  weight: 10,
};

export function RuleBuilderForm({ metricOptions }: { metricOptions: MetricTypeOption[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const selectOptions: SelectOption[] = metricOptions.map((option) => ({
    value: option.value,
    label: option.label,
  }));

  const form = useForm<HealthRuleFormValues>({
    resolver: zodResolver(healthRuleSchema) as never,
    defaultValues: { ...defaultValues, metric_type: selectOptions[0]?.value ?? '' },
  });

  async function onSubmit(values: HealthRuleFormValues) {
    const result = await createHealthRuleAction(values);

    if (!result.success) {
      let hadFieldMatch = false;
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        if (field in defaultValues) {
          form.setError(field as keyof HealthRuleFormValues, { message: messages[0] });
          hadFieldMatch = true;
        }
      }
      const topLevel = result.fieldErrors.non_field_errors?.[0];
      toast({
        title: 'Could not save rule',
        description: topLevel ?? (hadFieldMatch ? 'Check the highlighted fields.' : undefined),
        tone: 'error',
      });
      return;
    }

    toast({
      title: 'Rule saved successfully',
      description: `${result.data.name} is now live and evaluating your customer portfolio.`,
      tone: 'success',
    });
    form.reset({ ...defaultValues, metric_type: selectOptions[0]?.value ?? '' });
    router.push('/dashboard/rules');
  }

  return (
    <GlassCard className="space-y-6 relative overflow-hidden group">
      <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-emerald-500/20 via-transparent to-transparent" />
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-300 font-semibold">
          Predictive rules Engine
        </p>
        <h3 className="mt-1.5 text-xl font-bold text-white">Rule Builder</h3>
        <p className="mt-1 text-xs text-zinc-400 leading-normal max-w-xl">
          Define a weighted telemetry signal. When a customer violates it, the
          weight is subtracted from their health score.
        </p>
      </div>

      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Rule name" error={form.formState.errors.name?.message}>
            <Input
              className="h-10 text-sm"
              placeholder="e.g. Login drop watchlist"
              {...form.register('name')}
            />
          </Field>
          <Field label="Metric" error={form.formState.errors.metric_type?.message}>
            <Select options={selectOptions} {...form.register('metric_type')} />
          </Field>
          <Field label="Threshold" error={form.formState.errors.threshold?.message}>
            <Input
              className="h-10 text-sm"
              type="number"
              step="any"
              {...form.register('threshold', { valueAsNumber: true })}
            />
          </Field>
          <Field label="Weight" error={form.formState.errors.weight?.message}>
            <Input className="h-10 text-sm" type="number" {...form.register('weight', { valueAsNumber: true })} />
          </Field>
        </div>

        <div className="rounded-2xl border border-white/5 bg-black/25 p-4 text-xs text-zinc-500 flex items-start gap-3">
          <HelpCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-white">Validation parameters</p>
            <p className="mt-1 leading-normal">
              Weight must be greater than 0 and no more than 100. Threshold must be zero or greater.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-4 border-t border-white/5">
          <Button type="submit" variant="brand" className="h-10 text-xs" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving…' : 'Save logic rule'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-10 text-xs"
            onClick={() => form.reset({ ...defaultValues, metric_type: selectOptions[0]?.value ?? '' })}
          >
            Reset draft
          </Button>
        </div>
      </form>
    </GlassCard>
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
