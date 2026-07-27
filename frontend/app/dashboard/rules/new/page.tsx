import { PageWrapper } from '@/components/layout/page-wrapper';
import { RuleBuilderForm } from '@/components/features/rule-builder-form';
import { getMetricTypes } from '@/services/rules';

export const dynamic = 'force-dynamic';

export default async function NewRulePage() {
  const metricOptions = await getMetricTypes();

  return (
    <PageWrapper className="space-y-6 py-8 lg:py-10">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-zinc-500">
          Rule Builder
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-white">
          Define churn logic with strict controls.
        </h1>
        <p className="max-w-2xl text-zinc-400">
          Compose predictive rules, weight signals, and set review thresholds
          without sacrificing validation quality.
        </p>
      </div>
      <RuleBuilderForm metricOptions={metricOptions} />
    </PageWrapper>
  );
}
