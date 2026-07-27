'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Search, ShieldBan, ShieldCheck, Users2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { reactivateOrganizationAction, suspendOrganizationAction } from '@/app/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import type { OrganizationRecord, SubscriptionStatus } from '@/services/admin';

const STATUS_BADGE: Record<SubscriptionStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  past_due: 'warning',
  suspended: 'danger',
  cancelled: 'neutral',
};

export function OrganizationTable({ organizations: initial }: { organizations: OrganizationRecord[] }) {
  const [organizations, setOrganizations] = useState(initial);
  const [query, setQuery] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<OrganizationRecord | null>(null);
  const [reactivateTarget, setReactivateTarget] = useState<OrganizationRecord | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return organizations;
    return organizations.filter((org) =>
      [org.name, org.slug].some((field) => field.toLowerCase().includes(normalized))
    );
  }, [organizations, query]);

  async function handleSuspend(organization: OrganizationRecord) {
    setPendingId(organization.id);
    try {
      const updated = await suspendOrganizationAction(organization.id);
      setOrganizations((current) => current.map((org) => (org.id === updated.id ? updated : org)));
      toast({
        title: 'Organization suspended',
        description: `${organization.name} has been marked Suspended.`,
        tone: 'info',
      });
      // Re-syncs the server-rendered summary cards on /admin (Active/Suspended
      // counts), which this component's local state doesn't touch.
      router.refresh();
    } catch {
      toast({ title: 'Could not suspend organization', tone: 'error' });
    } finally {
      setPendingId(null);
      setConfirmTarget(null);
    }
  }

  async function handleReactivate(organization: OrganizationRecord) {
    setPendingId(organization.id);
    try {
      const updated = await reactivateOrganizationAction(organization.id);
      setOrganizations((current) => current.map((org) => (org.id === updated.id ? updated : org)));
      toast({
        title: 'Organization reactivated',
        description: `${organization.name} has been marked Active.`,
        tone: 'info',
      });
      router.refresh();
    } catch {
      toast({ title: 'Could not reactivate organization', tone: 'error' });
    } finally {
      setPendingId(null);
      setReactivateTarget(null);
    }
  }

  return (
    <GlassCard className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Tenant directory</p>
          <h3 className="mt-1.5 text-lg font-semibold text-white">Every organization on the platform</h3>
        </div>
        <label className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            className="h-10 w-64 rounded-xl border border-white/8 bg-black/30 pl-10 pr-4 text-sm text-white placeholder-zinc-500 transition-all focus:border-violet-400/30 focus:bg-black/50 focus:outline-none focus:ring-1 focus:ring-violet-400/30"
            placeholder="Search organizations..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search organizations"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/8 bg-black/10">
        <table
          className="min-w-full divide-y divide-white/8 text-left text-sm"
          role="grid"
          aria-label="Organization directory table"
        >
          <thead className="bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-500">
            <tr role="row">
              <th scope="col" className="px-5 py-3.5 font-semibold">Organization</th>
              <th scope="col" className="px-5 py-3.5 font-semibold">Subscription</th>
              <th scope="col" className="px-5 py-3.5 font-semibold">Customers</th>
              <th scope="col" className="px-5 py-3.5 font-semibold">Users</th>
              <th scope="col" className="px-5 py-3.5 font-semibold">Created</th>
              <th scope="col" className="px-5 py-3.5 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <motion.tbody className="divide-y divide-white/5 bg-transparent" initial={false}>
            {filtered.map((org) => {
              const isSuspended = org.subscriptionStatus === 'suspended';
              return (
                <tr key={org.id} role="row" className="transition-colors hover:bg-white/[0.03] group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/8 bg-black/20 text-zinc-400">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{org.name}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{org.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={STATUS_BADGE[org.subscriptionStatus]}>
                      {org.subscriptionStatusLabel}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 font-mono-numeric font-medium text-zinc-300">
                    {org.customerCount}
                  </td>
                  <td className="px-5 py-4 font-mono-numeric font-medium text-zinc-300">
                    {org.userCount}
                  </td>
                  <td className="px-5 py-4 text-zinc-400 text-xs font-medium">
                    {new Date(org.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {isSuspended ? (
                      <Button
                        type="button"
                        variant="subtle"
                        size="xs"
                        disabled={pendingId === org.id}
                        onClick={() => setReactivateTarget(org)}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Reactivate
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="danger"
                        size="xs"
                        disabled={pendingId === org.id}
                        onClick={() => setConfirmTarget(org)}
                      >
                        <ShieldBan className="h-3.5 w-3.5" />
                        Suspend
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </motion.tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-black/20 text-zinc-500">
              <Users2 className="h-5 w-5" />
            </div>
            <p className="font-medium text-white">No organizations matched your search</p>
          </div>
        )}
      </div>

      <p className="text-xs text-zinc-500 font-medium pt-2">
        Showing <span className="text-zinc-200 font-semibold">{filtered.length}</span> of{' '}
        <span className="text-zinc-200 font-semibold">{organizations.length}</span> organizations
      </p>

      <Modal
        open={confirmTarget !== null}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
        title="Suspend organization?"
        description={
          confirmTarget
            ? `${confirmTarget.name} will be marked Suspended immediately. This mirrors what happens automatically when a Lemon Squeezy payment fails.`
            : undefined
        }
      >
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" size="sm" onClick={() => setConfirmTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={pendingId === confirmTarget?.id}
            onClick={() => confirmTarget && handleSuspend(confirmTarget)}
          >
            Suspend organization
          </Button>
        </div>
      </Modal>

      <Modal
        open={reactivateTarget !== null}
        onOpenChange={(open) => !open && setReactivateTarget(null)}
        title="Reactivate organization?"
        description={
          reactivateTarget
            ? `${reactivateTarget.name} will be marked Active immediately.`
            : undefined
        }
      >
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" size="sm" onClick={() => setReactivateTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="subtle"
            size="sm"
            disabled={pendingId === reactivateTarget?.id}
            onClick={() => reactivateTarget && handleReactivate(reactivateTarget)}
          >
            Reactivate organization
          </Button>
        </div>
      </Modal>
    </GlassCard>
  );
}
