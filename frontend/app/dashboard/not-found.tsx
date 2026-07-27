import Link from 'next/link';
import { ArrowLeft, LayoutDashboard, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { PageWrapper } from '@/components/layout/page-wrapper';

export default function DashboardNotFound() {
  return (
    <PageWrapper className="flex min-h-[80vh] flex-col items-center justify-center py-10 px-4">
      <div className="relative max-w-md text-center space-y-8">
        <div>
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 mb-6">
            <Search className="h-10 w-10 text-zinc-500" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-3">Item not found</h1>
          <p className="text-zinc-400">
            We couldn&apos;t find the customer, playbook, or resource you were looking for. It may have been deleted or you might not have permission to view it.
          </p>
        </div>

        <GlassCard className="flex flex-col items-center text-center p-6 space-y-4">
          <p className="text-sm text-zinc-300">Return to the command center to see your active customers and risk alerts.</p>
          
          <div className="flex flex-wrap justify-center gap-3 w-full">
            <Button variant="brand" className="w-full sm:w-auto" asChild>
              <Link href="/dashboard">
                <LayoutDashboard className="h-4 w-4 mr-2" /> Command Center
              </Link>
            </Button>
            <Button variant="secondary" className="w-full sm:w-auto" asChild>
              <Link href="/dashboard/customers">
                <ArrowLeft className="h-4 w-4 mr-2" /> All Customers
              </Link>
            </Button>
          </div>
        </GlassCard>
      </div>
    </PageWrapper>
  );
}
