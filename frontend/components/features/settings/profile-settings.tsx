'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { updateProfileAction } from '@/app/actions';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { useAuth } from '@/context/auth-context';
import { profileSettingsSchema, type ProfileSettingsFormValues } from '@/lib/schemas';

export function ProfileSettings() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const form = useForm<ProfileSettingsFormValues>({
    resolver: zodResolver(profileSettingsSchema) as never,
    defaultValues: {
      full_name: user?.fullName ?? '',
      email: user?.email ?? '',
      title: user?.title ?? '',
    },
  });

  async function onSubmit(values: ProfileSettingsFormValues) {
    const result = await updateProfileAction(values);

    if (!result.success) {
      let hadFieldMatch = false;
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        if (field in values) {
          form.setError(field as keyof ProfileSettingsFormValues, { message: messages[0] });
          hadFieldMatch = true;
        }
      }
      const topLevel = result.fieldErrors.non_field_errors?.[0];
      toast({
        title: 'Could not save profile',
        description: topLevel ?? (hadFieldMatch ? 'Check the highlighted fields.' : undefined),
        tone: 'error',
      });
      return;
    }

    updateUser(result.data);
    toast({ title: 'Profile updated', tone: 'success' });
  }

  return (
    <GlassCard className="space-y-6 relative overflow-hidden group">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500/20 via-transparent to-transparent" />
      <div>
        <h2 className="font-semibold text-white text-base">Profile settings</h2>
        <p className="text-xs text-zinc-400 mt-0.5">Update your personal identification information and team role.</p>
      </div>

      <div className="flex items-center gap-4 pt-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-violet-600 text-lg font-bold text-white shadow-[0_4px_16px_rgba(16,185,129,0.2)]">
          {user?.fullName?.split(' ').map((w: string) => w[0]).join('').slice(0, 2) || 'CS'}
        </div>
        <div>
          <p className="font-semibold text-white text-base leading-tight">{user?.fullName || 'CS User'}</p>
          <p className="text-xs text-zinc-500 mt-1">
            {user?.companyName || 'Foresight Labs'} · {user?.role || 'User'}
          </p>
        </div>
      </div>

      <form
        noValidate
        className="grid gap-4 sm:grid-cols-2 pt-2"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Field label="Full name" error={form.formState.errors.full_name?.message}>
          <Input className="h-10 text-sm" placeholder="Your name" {...form.register('full_name')} />
        </Field>
        <Field label="Role / Title" error={form.formState.errors.title?.message}>
          <Input className="h-10 text-sm" placeholder="e.g. CSM, VP CS" {...form.register('title')} />
        </Field>
        <Field
          label="Work email"
          error={form.formState.errors.email?.message}
          className="sm:col-span-2"
        >
          <Input
            className="h-10 text-sm"
            type="email"
            placeholder="you@company.com"
            {...form.register('email')}
          />
        </Field>

        <Button
          type="submit"
          variant="brand"
          className="h-10 text-xs sm:col-span-2 w-fit"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? 'Saving…' : 'Save profile changes'}
        </Button>
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
