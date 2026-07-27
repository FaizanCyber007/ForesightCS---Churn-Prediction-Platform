import { ScrollText } from 'lucide-react';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { AuditLogTable } from '@/components/features/audit-log-table';
import { StatCardGrid } from '@/components/features/stat-card-grid';
import { getAuditLogs } from '@/services/admin';

export const dynamic = 'force-dynamic';

export default async function AuditLogPage() {
  const entries = await getAuditLogs();

  const summaryCards = [
    {
      id: 'total',
      label: 'Total entries',
      value: entries.length,
      icon: ScrollText,
      color: 'text-zinc-300',
      bg: 'border-zinc-400/10 from-zinc-500/10 to-transparent',
    },
  ];

  return (
    <PageWrapper className="space-y-8 py-8 lg:py-10">
      <section className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500 font-semibold">
            Platform administration
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white mt-1">Audit Trail</h1>
          <p className="max-w-xl text-sm text-zinc-400 leading-relaxed mt-1">
            A read-only, immutable record of critical platform actions -- rule changes and
            billing-state transitions -- for SOC2-style auditing.
          </p>
        </div>

        <StatCardGrid cards={summaryCards} />
      </section>

      <AuditLogTable entries={entries} />
    </PageWrapper>
  );
}
