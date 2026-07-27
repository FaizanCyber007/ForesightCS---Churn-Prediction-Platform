'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { createCustomerAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { customerSchema, type CustomerFormValues } from '@/lib/schemas';

const SEGMENT_OPTIONS = [
  { value: 'SMB', label: 'SMB' },
  { value: 'Mid-Market', label: 'Mid-Market' },
  { value: 'Expansion', label: 'Expansion' },
];

const PLAN_OPTIONS = [
  { value: 'Starter', label: 'Starter' },
  { value: 'Growth', label: 'Growth' },
  { value: 'Scale', label: 'Scale' },
  { value: 'Enterprise', label: 'Enterprise' },
];

const defaultValues: CustomerFormValues = {
  name: '',
  company_name: '',
  segment: 'SMB',
  plan: 'Starter',
  mrr: 0,
  annual_contract_value: 0,
  renewal_date: '',
  nps: 0,
  expansion_potential: 0,
};

export function AddCustomerModal() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema) as never,
    defaultValues,
  });

  function closeAndReset(next: boolean) {
    setOpen(next);
    if (!next) form.reset(defaultValues);
  }

  async function onSubmit(values: CustomerFormValues) {
    const result = await createCustomerAction(values);

    if (!result.success) {
      let hadFieldMatch = false;
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        if (field in defaultValues) {
          form.setError(field as keyof CustomerFormValues, { message: messages[0] });
          hadFieldMatch = true;
        }
      }
      const topLevel = result.fieldErrors.non_field_errors?.[0];
      toast({
        title: 'Could not add customer',
        description: topLevel ?? (hadFieldMatch ? 'Check the highlighted fields.' : undefined),
        tone: 'error',
      });
      return;
    }

    toast({
      title: 'Customer added',
      description: `${result.data.company} is now tracked in your portfolio.`,
      tone: 'success',
    });
    form.reset(defaultValues);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="brand" className="h-10 text-xs gap-1.5" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" />
        Add customer
      </Button>

      <Modal
        open={open}
        onOpenChange={closeAndReset}
        title="Add customer"
        description="Manually enter a new customer into your churn-tracking portfolio."
      >
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact name" error={form.formState.errors.name?.message}>
              <Input className="h-10 text-sm" placeholder="Jane Doe" {...form.register('name')} />
            </Field>
            <Field label="Company name" error={form.formState.errors.company_name?.message}>
              <Input className="h-10 text-sm" placeholder="Acme Inc." {...form.register('company_name')} />
            </Field>
            <Field label="Segment" error={form.formState.errors.segment?.message}>
              <Select options={SEGMENT_OPTIONS} {...form.register('segment')} />
            </Field>
            <Field label="Plan" error={form.formState.errors.plan?.message}>
              <Select options={PLAN_OPTIONS} {...form.register('plan')} />
            </Field>
            <Field label="MRR ($)" error={form.formState.errors.mrr?.message}>
              <Input
                className="h-10 text-sm"
                type="number"
                step="any"
                min="0"
                {...form.register('mrr', { valueAsNumber: true })}
              />
            </Field>
            <Field label="Annual contract value ($)" error={form.formState.errors.annual_contract_value?.message}>
              <Input
                className="h-10 text-sm"
                type="number"
                step="any"
                min="0"
                {...form.register('annual_contract_value', { valueAsNumber: true })}
              />
            </Field>
            <Field label="Renewal date" error={form.formState.errors.renewal_date?.message}>
              <Input className="h-10 text-sm" type="date" {...form.register('renewal_date')} />
            </Field>
            <Field label="NPS" error={form.formState.errors.nps?.message}>
              <Input
                className="h-10 text-sm"
                type="number"
                min="-100"
                max="100"
                {...form.register('nps', { valueAsNumber: true })}
              />
            </Field>
            <Field
              label="Expansion potential (%)"
              error={form.formState.errors.expansion_potential?.message}
              className="sm:col-span-2"
            >
              <Input
                className="h-10 text-sm"
                type="number"
                min="0"
                max="100"
                {...form.register('expansion_potential', { valueAsNumber: true })}
              />
            </Field>
          </div>

          <div className="flex flex-wrap justify-end gap-2.5 pt-2 border-t border-white/5">
            <Button type="button" variant="secondary" className="h-10 text-xs" onClick={() => closeAndReset(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" className="h-10 text-xs" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Adding…' : 'Add customer'}
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
