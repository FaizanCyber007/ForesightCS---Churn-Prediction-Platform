'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ScrollText, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/glass-card';
import type { AuditLogRecord } from '@/services/admin';

const ACTION_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  rule_created: 'success',
  rule_updated: 'neutral',
  org_suspended: 'danger',
  org_reactivated: 'success',
};

/**
 * Read-only Super Admin surface for `core.AuditLog` (backend/core/audit.py
 * is the single writer) -- deliberately no actions column: this is a trail,
 * not something an operator edits.
 */
export function AuditLogTable({ entries }: { entries: AuditLogRecord[] }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return entries;
    return entries.filter((entry) =>
      [entry.description, entry.actorUsername ?? '', entry.organizationName ?? '']
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    );
  }, [entries, query]);

  return (
    <GlassCard className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">SOC2 audit trail</p>
          <h3 className="mt-1.5 text-lg font-semibold text-white">Every critical platform action</h3>
        </div>
        <label className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            className="h-10 w-64 rounded-xl border border-white/8 bg-black/30 pl-10 pr-4 text-sm text-white placeholder-zinc-500 transition-all focus:border-violet-400/30 focus:bg-black/50 focus:outline-none focus:ring-1 focus:ring-violet-400/30"
            placeholder="Search audit log..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search audit log"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/8 bg-black/10">
        <table
          className="min-w-full divide-y divide-white/8 text-left text-sm"
          role="grid"
          aria-label="Audit log table"
        >
          <thead className="bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-500">
            <tr role="row">
              <th scope="col" className="px-5 py-3.5 font-semibold">
                Action
              </th>
              <th scope="col" className="px-5 py-3.5 font-semibold">
                Description
              </th>
              <th scope="col" className="px-5 py-3.5 font-semibold">
                Organization
              </th>
              <th scope="col" className="px-5 py-3.5 font-semibold">
                Actor
              </th>
              <th scope="col" className="px-5 py-3.5 font-semibold">
                When
              </th>
            </tr>
          </thead>
          <motion.tbody className="divide-y divide-white/5 bg-transparent" initial={false}>
            {filtered.map((entry) => (
              <tr key={entry.id} role="row" className="transition-colors hover:bg-white/[0.03]">
                <td className="px-5 py-4">
                  <Badge variant={ACTION_BADGE[entry.action] ?? 'neutral'}>
                    {entry.actionDisplay}
                  </Badge>
                </td>
                <td className="px-5 py-4 text-zinc-300">{entry.description}</td>
                <td className="px-5 py-4 text-zinc-400">{entry.organizationName ?? '—'}</td>
                <td className="px-5 py-4 text-zinc-400">{entry.actorUsername ?? 'System'}</td>
                <td className="px-5 py-4 text-xs font-medium text-zinc-500">
                  {new Date(entry.createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </td>
              </tr>
            ))}
          </motion.tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-black/20 text-zinc-500">
              <ScrollText className="h-5 w-5" />
            </div>
            <p className="font-medium text-white">
              {entries.length === 0 ? 'No audit log entries yet' : 'No entries matched your search'}
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-zinc-500 font-medium pt-2">
        Showing <span className="text-zinc-200 font-semibold">{filtered.length}</span> of{' '}
        <span className="text-zinc-200 font-semibold">{entries.length}</span> entries
      </p>
    </GlassCard>
  );
}
