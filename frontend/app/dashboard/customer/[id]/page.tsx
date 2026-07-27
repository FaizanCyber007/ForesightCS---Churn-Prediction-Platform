import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { Customer360 } from '@/components/features/customer-360';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { getCustomerById, getTasksForCustomer } from '@/services/api';

export const dynamic = 'force-dynamic';

type CustomerPageProps = {
  params: Promise<{ id: string }>;
};

/** Dedupes the fetch so `generateMetadata` and the page component share one request per render. */
const loadCustomer = cache((id: string) => getCustomerById(id));

export async function generateMetadata({ params }: CustomerPageProps): Promise<Metadata> {
  const { id } = await params;
  const customer = await loadCustomer(id);

  if (!customer) {
    return {
      title: 'Customer Not Found',
    };
  }

  return {
    title: `${customer.company} — Customer 360`,
    description: `Health snapshot and analytics for ${customer.company}.`,
  };
}

export default async function CustomerPage({ params }: CustomerPageProps) {
  const { id } = await params;
  const customer = await loadCustomer(id);

  if (!customer) {
    return notFound();
  }

  const tasks = await getTasksForCustomer(id);

  return (
    <PageWrapper className="space-y-6 py-8 lg:py-10">
      <Customer360 customer={customer} tasks={tasks} />
    </PageWrapper>
  );
}
