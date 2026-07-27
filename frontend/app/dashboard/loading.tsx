import { GlassCard } from '@/components/ui/glass-card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageWrapper } from '@/components/layout/page-wrapper';

export default function DashboardLoading() {
  return (
    <PageWrapper className="space-y-8 py-8 lg:py-10">
      {/* Header skeleton */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-10 w-80" />
            <Skeleton className="h-4 w-[26rem] max-w-full" />
          </div>
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-28 rounded-3xl" />
            ))}
          </div>
        </div>

        {/* Metric cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <GlassCard key={index} className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-4 w-full" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-2 flex-1" />
                <Skeleton className="h-4 w-12" />
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Charts + feed skeleton */}
      <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="grid gap-4 xl:grid-cols-[1.5fr_0.9fr]">
          <GlassCard className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-6 w-48" />
            </div>
            <Skeleton className="h-[280px] w-full rounded-2xl" />
          </GlassCard>
          <GlassCard className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-40" />
            </div>
            <Skeleton className="h-[220px] w-full rounded-full" />
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="mx-auto h-4 w-20" />
                  <Skeleton className="mx-auto h-6 w-10" />
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        <div className="space-y-4">
          <GlassCard className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-3xl" />
              ))}
            </div>
          </GlassCard>
          <GlassCard className="space-y-4">
            <Skeleton className="h-4 w-28" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-2xl" />
              ))}
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Table skeleton */}
      <GlassCard className="space-y-5">
        <div className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-52" />
          </div>
        </div>
        <div className="overflow-hidden rounded-[28px] border border-white/10">
          <div className="bg-white/4 px-4 py-4">
            <div className="flex gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-4 flex-1" />
              ))}
            </div>
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-4 border-t border-white/10 px-4 py-4"
            >
              <div className="flex-[2] space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-16 flex-1 rounded-full" />
              <Skeleton className="h-4 w-12 flex-1" />
              <Skeleton className="h-4 w-16 flex-1" />
              <Skeleton className="h-4 w-16 flex-1" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Priority watch skeleton */}
      <section className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <GlassCard key={i} className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </GlassCard>
        ))}
      </section>
    </PageWrapper>
  );
}
