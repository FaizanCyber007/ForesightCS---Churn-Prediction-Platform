'use client';

import { useState, useTransition } from 'react';
import { Users2 } from 'lucide-react';

import { getOrganizationCustomersAction } from '@/app/actions';
import { GlassCard } from '@/components/ui/glass-card';
import { useToast } from '@/components/ui/toast';
import type { CustomerRecord } from '@/services/api';
import type { OrganizationRecord } from '@/services/admin';

export function OrganizationCustomersPanel({ organizations }: { organizations: OrganizationRecord[] }) {
  const [selectedId, setSelectedId] = useState('');
  const [customers, setCustomers] = useState<CustomerRecord[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  function handleSelect(id: string) {
    setSelectedId(id);
    if (!id) {
      setCustomers(null);
      return;
    }
    startTransition(async () => {
      try {
        const result = await getOrganizationCustomersAction(id);
        setCustomers(result);
      } catch {
        toast({ title: 'Could not load customers for this organization', tone: 'error' });
      }
    });
  }

  return (
    <GlassCard className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Drill down</p>
          <h3 className="mt-1.5 text-lg font-semibold text-white">View customers by organization</h3>
        </div>
        <select
          className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3.5 text-sm text-white transition-all focus:border-violet-400/30 focus:bg-black/50 focus:outline-none focus:ring-1 focus:ring-violet-400/30 sm:w-72"
          value={selectedId}
          onChange={(event) => handleSelect(event.target.value)}
          aria-label="Filter customers by organization"
        >
          <option value="">Select an organization…</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>

      {isPending && <p className="text-sm text-zinc-500">Loading customers…</p>}

      {!isPending && customers !== null && (
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-black/10">
          <table
            className="min-w-full divide-y divide-white/8 text-left text-sm"
            role="grid"
            aria-label="Organization customers table"
          >
            <thead className="bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-500">
              <tr role="row">
                <th scope="col" className="px-5 py-3 font-semibold">Customer</th>
                <th scope="col" className="px-5 py-3 font-semibold">Plan</th>
                <th scope="col" className="px-5 py-3 font-semibold">Health</th>
                <th scope="col" className="px-5 py-3 font-semibold">MRR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {customers.map((customer) => (
                <tr key={customer.id} role="row">
                  <td className="px-5 py-3.5 font-medium text-white">{customer.company}</td>
                  <td className="px-5 py-3.5 text-zinc-300">{customer.plan}</td>
                  <td className="px-5 py-3.5 text-zinc-300">{customer.health}</td>
                  <td className="px-5 py-3.5 font-mono-numeric text-zinc-300">
                    {customer.monthlyRecurringRevenue.toLocaleString()}
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr role="row">
                  <td colSpan={4} className="px-5 py-10 text-center text-zinc-500">
                    <Users2 className="mx-auto mb-2 h-5 w-5" />
                    No customers found for this organization.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  );
}
