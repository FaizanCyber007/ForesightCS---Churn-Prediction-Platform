import { getCustomers } from '@/services/api';
import { CustomerTable } from '@/components/features/customer-table';
import { StatCardGrid } from '@/components/features/stat-card-grid';
import { AddCustomerModal } from '@/components/features/add-customer-modal';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { buildCustomerSummaryCards } from '@/lib/customers';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const customers = await getCustomers();
  const summaryCards = buildCustomerSummaryCards(customers);

  return (
    <PageWrapper className="space-y-8 py-8 lg:py-10">
      <section className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500 font-semibold">Portfolio directory</p>
            <h1 className="text-4xl font-bold tracking-tight text-white mt-1">Customers</h1>
            <p className="max-w-xl text-sm text-zinc-400 leading-relaxed mt-1">
              Browse and filter your complete customer directory, check current churn status metrics, and drill down into individual profiles.
            </p>
          </div>
          <AddCustomerModal />
        </div>

        {/* Summary grid */}
        <StatCardGrid cards={summaryCards} />
      </section>

      <CustomerTable customers={customers} />
    </PageWrapper>
  );
}
