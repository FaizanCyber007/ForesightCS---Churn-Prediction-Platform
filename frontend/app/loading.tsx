import { GlassCard } from '@/components/ui/glass-card';
import { PageWrapper } from '@/components/layout/page-wrapper';

export default function RootLoading() {
  return (
    <PageWrapper className="flex min-h-screen items-center justify-center py-10">
      <GlassCard className="animate-pulse space-y-4 text-center">
        <div className="mx-auto h-4 w-36 rounded-full bg-white/10" />
        <div className="mx-auto h-10 w-80 rounded-full bg-white/10" />
        <div className="mx-auto h-4 w-96 rounded-full bg-white/10" />
      </GlassCard>
    </PageWrapper>
  );
}
