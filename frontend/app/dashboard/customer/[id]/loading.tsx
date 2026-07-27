import { GlassCard } from '@/components/ui/glass-card';
import { PageWrapper } from '@/components/layout/page-wrapper';

export default function CustomerLoading() {
  return (
    <PageWrapper className="space-y-6 py-8">
      <GlassCard className="animate-pulse space-y-4">
        <div className="h-4 w-36 rounded-full bg-white/10" />
        <div className="h-10 w-64 rounded-full bg-white/10" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 rounded-3xl bg-white/10" />
          ))}
        </div>
      </GlassCard>
    </PageWrapper>
  );
}
