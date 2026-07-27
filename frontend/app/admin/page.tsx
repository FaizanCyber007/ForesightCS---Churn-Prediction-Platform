import { Building2, ShieldBan, ShieldCheck, TriangleAlert } from 'lucide-react';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { OrganizationCustomersPanel } from '@/components/features/organization-customers-panel';
import { OrganizationTable } from '@/components/features/organization-table';
import { StatCardGrid } from '@/components/features/stat-card-grid';
import { getOrganizations } from '@/services/admin';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const organizations = await getOrganizations();

  const active = organizations.filter((org) => org.subscriptionStatus === 'active').length;
  const pastDue = organizations.filter((org) => org.subscriptionStatus === 'past_due').length;
  const suspended = organizations.filter((org) => org.subscriptionStatus === 'suspended').length;

  const summaryCards = [
    {
      id: 'total',
      label: 'Total organizations',
      value: organizations.length,
      icon: Building2,
      color: 'text-zinc-300',
      bg: 'border-zinc-400/10 from-zinc-500/10 to-transparent',
    },
    {
      id: 'active',
      label: 'Active',
      value: active,
      icon: ShieldCheck,
      color: 'text-emerald-300',
      bg: 'border-emerald-400/20 from-emerald-500/10 to-transparent',
    },
    {
      id: 'past-due',
      label: 'Past due',
      value: pastDue,
      icon: TriangleAlert,
      color: 'text-amber-300',
      bg: 'border-amber-400/20 from-amber-500/10 to-transparent',
    },
    {
      id: 'suspended',
      label: 'Suspended',
      value: suspended,
      icon: ShieldBan,
      color: 'text-rose-300',
      bg: 'border-rose-400/20 from-rose-500/10 to-transparent',
    },
  ];

  return (
    <PageWrapper className="space-y-8 py-8 lg:py-10">
      <section className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500 font-semibold">
            Platform administration
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white mt-1">Organizations</h1>
          <p className="max-w-xl text-sm text-zinc-400 leading-relaxed mt-1">
            Every tenant on ForesightCS, with live billing status from Lemon Squeezy. Suspend an
            organization manually, or let payment-failure webhooks handle it automatically.
          </p>
        </div>

        <StatCardGrid cards={summaryCards} />
      </section>

      <OrganizationTable organizations={organizations} />
      <OrganizationCustomersPanel organizations={organizations} />
    </PageWrapper>
  );
}
