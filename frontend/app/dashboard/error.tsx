'use client';

import { isServiceUnavailable } from '@/lib/apiClient';
import { ErrorState, ServiceUnavailableState } from '@/components/ui/error-state';

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  if (isServiceUnavailable(error)) {
    return <ServiceUnavailableState reset={reset} />;
  }

  return (
    <ErrorState
      eyebrow="Dashboard error"
      title="The command center did not load."
      description="The route state failed to render. You can retry or return to the landing page."
      reset={reset}
      homeHref="/"
      homeLabel="Go home"
    />
  );
}
