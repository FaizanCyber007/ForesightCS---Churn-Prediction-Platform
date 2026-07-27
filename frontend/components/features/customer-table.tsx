'use client';

import { motion } from 'framer-motion';
import { ArrowUpDown, ChevronDown, ChevronUp, Search, Users, ExternalLink } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/glass-card';
import { cn } from '@/lib/cn';
import type { CustomerRecord, HealthStatus } from '@/services/api';

type SortKey =
  | 'company'
  | 'health'
  | 'churnProbability'
  | 'monthlyRecurringRevenue'
  | 'renewalDate';

const healthOrder: Record<HealthStatus, number> = {
  Critical: 0,
  'At-Risk': 1,
  Healthy: 2,
};

const HEALTH_OPTIONS: (HealthStatus | 'All')[] = ['All', 'Healthy', 'At-Risk', 'Critical'];

export function CustomerTable({ customers }: { customers: CustomerRecord[] }) {
  const [query, setQuery] = useState('');
  const [healthFilter, setHealthFilter] = useState<HealthStatus | 'All'>('All');
  const [sortKey, setSortKey] = useState<SortKey>('churnProbability');
  const [ascending, setAscending] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return customers
      .filter((customer) =>
        healthFilter === 'All' ? true : customer.health === healthFilter
      )
      .filter((customer) => {
        if (!normalized) return true;
        return [
          customer.company,
          customer.name,
          customer.owner,
          customer.plan,
          customer.segment,
        ].some((field) => field.toLowerCase().includes(normalized));
      })
      .sort((a, b) => {
        let comparison = 0;

        if (sortKey === 'health') {
          comparison = healthOrder[a.health] - healthOrder[b.health];
        } else if (sortKey === 'renewalDate') {
          comparison =
            new Date(a.renewalDate).getTime() -
            new Date(b.renewalDate).getTime();
        } else {
          comparison =
            (a[sortKey] as number | string) > (b[sortKey] as number | string)
              ? 1
              : -1;
        }

        return ascending ? comparison : -comparison;
      });
  }, [customers, healthFilter, query, sortKey, ascending]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setAscending((v) => !v);
    } else {
      setSortKey(key);
      setAscending(false);
    }
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: 'company', label: 'Customer' },
    { key: 'health', label: 'Health' },
    { key: 'churnProbability', label: 'Risk' },
    { key: 'monthlyRecurringRevenue', label: 'MRR' },
    { key: 'renewalDate', label: 'Renewal' },
  ];

  return (
    <GlassCard className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Customers portfolio</p>
          <h3 className="mt-1.5 text-lg font-semibold text-white">Customer intelligence ledger</h3>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <label className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              className="h-10 w-52 rounded-xl border border-white/8 bg-black/30 pl-10 pr-4 text-sm text-white placeholder-zinc-500 transition-all focus:border-emerald-400/30 focus:bg-black/50 focus:outline-none focus:ring-1 focus:ring-emerald-400/30"
              placeholder="Search customers..."
              value={query}
              onChange={(event) =>
                startTransition(() => setQuery(event.target.value))
              }
              aria-label="Search customers"
            />
          </label>

          {/* Health filter segment */}
          <div className="flex items-center gap-1 rounded-xl border border-white/8 bg-black/20 p-1">
            {HEALTH_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => setHealthFilter(option)}
                className={cn(
                  'rounded-lg px-3 py-1 text-xs font-semibold transition-all',
                  healthFilter === option
                    ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20'
                    : 'text-zinc-500 hover:text-zinc-300'
                )}
                aria-pressed={healthFilter === option}
              >
                {option}
              </button>
            ))}
          </div>

          {/* Sort direction */}
          <button
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/8 bg-black/20 px-4 text-xs font-semibold text-zinc-300 transition hover:bg-black/40 hover:text-white"
            onClick={() => setAscending((value) => !value)}
            aria-label={ascending ? 'Sort descending' : 'Sort ascending'}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {ascending ? 'Asc' : 'Desc'}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/8 bg-black/10">
        <table
          className="min-w-full divide-y divide-white/8 text-left text-sm"
          role="grid"
          aria-label="Customer table"
        >
          <thead className="bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-500">
            <tr role="row">
              {columns.map(({ key, label }) => (
                <th
                  key={key}
                  scope="col"
                  className="px-5 py-3.5 font-semibold"
                >
                  <button
                    className="inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400/50 rounded hover:text-zinc-300 transition-colors"
                    onClick={() => handleSort(key)}
                  >
                    {label}
                    {sortKey === key ? (
                      ascending ? (
                        <ChevronUp className="h-3.5 w-3.5 text-emerald-300" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-emerald-300" />
                      )
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 opacity-20" />
                    )}
                  </button>
                </th>
              ))}
              <th scope="col" className="px-5 py-3.5 text-right font-semibold">
                Details
              </th>
            </tr>
          </thead>
          <motion.tbody
            className="divide-y divide-white/5 bg-transparent"
            initial={false}
            animate={{ opacity: isPending ? 0.7 : 1 }}
            transition={{ duration: 0.15 }}
          >
            {filtered.map((customer) => (
              <tr
                key={customer.id}
                role="row"
                onClick={() => router.push(`/dashboard/customer/${customer.id}`)}
                className="cursor-pointer transition-colors hover:bg-white/[0.03] group"
              >
                <td className="px-5 py-4">
                  <div>
                    <p className="font-semibold text-white group-hover:text-emerald-300 transition-colors">{customer.company}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {customer.name} · {customer.segment} · {customer.plan}
                    </p>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <Badge
                    variant={
                      customer.health === 'Healthy'
                        ? 'success'
                        : customer.health === 'At-Risk'
                          ? 'warning'
                          : 'danger'
                    }
                  >
                    {customer.health}
                  </Badge>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/5">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          customer.churnProbability >= 60
                            ? 'bg-rose-500'
                            : customer.churnProbability >= 30
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                        )}
                        style={{ width: `${customer.churnProbability}%` }}
                      />
                    </div>
                    <span className="font-mono-numeric font-semibold text-zinc-300 text-xs">
                      {customer.churnProbability}%
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4 font-mono-numeric font-medium text-zinc-300">
                  ${customer.monthlyRecurringRevenue.toLocaleString()}
                </td>
                <td className="px-5 py-4 text-zinc-400 text-xs font-medium">
                  {new Date(customer.renewalDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-5 py-4 text-right">
                  <span className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/5 bg-white/5 px-2.5 text-xs font-semibold text-zinc-400 group-hover:border-emerald-400/25 group-hover:bg-emerald-400/10 group-hover:text-emerald-300 transition-all">
                    View 360 <ExternalLink className="h-3 w-3" />
                  </span>
                </td>
              </tr>
            ))}
          </motion.tbody>
        </table>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-black/20 text-zinc-500">
              <Users className="h-5 w-5" />
            </div>
            <p className="font-medium text-white">No customers matched filters</p>
            <p className="text-sm text-zinc-500 max-w-[280px]">
              Try refining your search terms or selecting &apos;All&apos; health options.
            </p>
            <button
              className="mt-2 text-xs font-semibold text-emerald-300 hover:text-emerald-200 transition-colors"
              onClick={() => {
                setQuery('');
                setHealthFilter('All');
              }}
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500 font-medium pt-2">
        <p>
          Showing <span className="text-zinc-200 font-semibold">{filtered.length}</span> of{' '}
          <span className="text-zinc-200 font-semibold">{customers.length}</span> customers in scope
        </p>
        {filtered.length < customers.length && (
          <button
            className="text-emerald-300 hover:text-emerald-200 transition-colors"
            onClick={() => {
              setQuery('');
              setHealthFilter('All');
            }}
          >
            Show all
          </button>
        )}
      </div>
    </GlassCard>
  );
}
