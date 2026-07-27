'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import * as React from 'react';
import { useForm } from 'react-hook-form';

import { getWorkspaceAction, updateWorkspaceAction } from '@/app/actions';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/auth-context';
import { workspaceSettingsSchema, type WorkspaceSettingsFormValues } from '@/lib/schemas';

export function WorkspaceSettings() {
  const { refreshSession } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [slug, setSlug] = React.useState('');
  const [loadError, setLoadError] = React.useState(false);

  const form = useForm<WorkspaceSettingsFormValues>({
    resolver: zodResolver(workspaceSettingsSchema) as never,
    defaultValues: { name: '' },
  });

  React.useEffect(() => {
    let cancelled = false;
    getWorkspaceAction()
      .then((organization) => {
        if (cancelled) return;
        form.reset({ name: organization.name });
        setSlug(organization.slug);
      })
      .catch(() => {
        // `getWorkspaceAction` hits GET /api/v1/organizations/me/, which
        // deliberately 404s for any user with no organization (e.g. a
        // superuser) -- for that persona this mount fetch always rejects.
        // Surface it instead of leaving an unexplained empty form (and an
        // unhandled promise rejection) behind.
        if (cancelled) return;
        setLoadError(true);
        toast({
          title: 'Could not load workspace',
          description: 'Could not load your workspace.',
          tone: 'error',
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Runs once on mount only -- `form` and `toast` are stable references.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(values: WorkspaceSettingsFormValues) {
    const result = await updateWorkspaceAction(values);

    if (!result.success) {
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        if (field in values) {
          form.setError(field as keyof WorkspaceSettingsFormValues, { message: messages[0] });
        }
      }
      const topLevel = result.fieldErrors.non_field_errors?.[0];
      toast({ title: 'Could not save workspace', description: topLevel, tone: 'error' });
      return;
    }

    await refreshSession();
    toast({ title: 'Workspace updated', tone: 'success' });
  }

  return (
    <GlassCard className="space-y-6 relative overflow-hidden group">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-500/20 via-transparent to-transparent" />
      <div>
        <h2 className="font-semibold text-white text-base">Workspace</h2>
        <p className="text-xs text-zinc-400 mt-0.5">Update the identity of your organization.</p>
      </div>

      {loadError ? (
        <p role="alert" className="text-xs font-medium text-rose-400">
          Could not load your workspace.
        </p>
      ) : (
        <form className="space-y-4 pt-2" onSubmit={form.handleSubmit(onSubmit)}>
          <label className="space-y-1.5 block">
            <span className="text-xs font-semibold text-zinc-400">Workspace name</span>
            <Input
              className="h-10 text-sm"
              placeholder="Your company"
              disabled={loading}
              {...form.register('name')}
            />
            {form.formState.errors.name ? (
              <p role="alert" className="text-[10px] font-semibold text-rose-400">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </label>
          {slug ? <p className="text-[10px] text-zinc-500">Workspace URL slug: {slug}</p> : null}

          <Button
            type="submit"
            variant="brand"
            className="h-10 text-xs"
            disabled={loading || form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Saving…' : 'Save workspace changes'}
          </Button>
        </form>
      )}
    </GlassCard>
  );
}
