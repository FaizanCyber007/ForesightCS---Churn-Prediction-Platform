'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { PencilLine, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { createContactAction, updateContactAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { contactSchema, type ContactFormValues } from '@/lib/schemas';
import type { CustomerContact } from '@/services/api';

const emptyValues: ContactFormValues = {
  name: '',
  role: '',
  email: '',
  phone: '',
};

function toFormValues(contact: CustomerContact): ContactFormValues {
  return {
    name: contact.name,
    role: contact.role,
    email: contact.email,
    phone: contact.phone,
  };
}

export function ContactFormModal({
  customerId,
  contact,
}: {
  customerId: string;
  contact?: CustomerContact;
}) {
  const isEdit = Boolean(contact);
  const initialValues = contact ? toFormValues(contact) : emptyValues;

  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema) as never,
    defaultValues: initialValues,
  });

  function closeAndReset(next: boolean) {
    setOpen(next);
    if (!next) form.reset(initialValues);
  }

  async function onSubmit(values: ContactFormValues) {
    const result =
      isEdit && contact
        ? await updateContactAction(customerId, contact.id, values)
        : await createContactAction(customerId, values);

    if (!result.success) {
      let hadFieldMatch = false;
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        if (field in initialValues) {
          form.setError(field as keyof ContactFormValues, { message: messages[0] });
          hadFieldMatch = true;
        }
      }
      const topLevel = result.fieldErrors.non_field_errors?.[0];
      toast({
        title: isEdit ? 'Could not update contact' : 'Could not add contact',
        description: topLevel ?? (hadFieldMatch ? 'Check the highlighted fields.' : undefined),
        tone: 'error',
      });
      return;
    }

    toast({
      title: isEdit ? 'Contact updated' : 'Contact added',
      description: result.data.name,
      tone: 'success',
    });
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      {isEdit ? (
        <button
          type="button"
          aria-label="Edit contact"
          onClick={() => setOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          title="Edit contact"
        >
          <PencilLine className="h-4 w-4" />
        </button>
      ) : (
        <Button variant="secondary" size="sm" className="h-9 w-full text-xs gap-1.5" onClick={() => setOpen(true)}>
          <UserPlus className="h-3.5 w-3.5" /> Add contact
        </Button>
      )}

      <Modal
        open={open}
        onOpenChange={closeAndReset}
        title={isEdit ? 'Edit contact' : 'Add contact'}
        description="A stakeholder at this customer, shown on the Customer 360 view."
      >
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" error={form.formState.errors.name?.message} className="sm:col-span-2">
              <Input className="h-10 text-sm" placeholder="Jane Doe" {...form.register('name')} />
            </Field>
            <Field label="Role" error={form.formState.errors.role?.message}>
              <Input className="h-10 text-sm" placeholder="Executive Sponsor" {...form.register('role')} />
            </Field>
            <Field label="Phone (optional)" error={form.formState.errors.phone?.message}>
              <Input className="h-10 text-sm" placeholder="+1 555 010 2020" {...form.register('phone')} />
            </Field>
            <Field label="Email" error={form.formState.errors.email?.message} className="sm:col-span-2">
              <Input className="h-10 text-sm" type="email" placeholder="jane@acme.com" {...form.register('email')} />
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
                  : 'Adding…'
                : isEdit
                  ? 'Save changes'
                  : 'Add contact'}
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
