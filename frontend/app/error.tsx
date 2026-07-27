'use client';

import { isServiceUnavailable } from '@/lib/apiClient';
import { ErrorState, ServiceUnavailableState } from '@/components/ui/error-state';

export default function RootError({ error, reset }: { error: Error; reset: () => void }) {
  if (isServiceUnavailable(error)) {
    return <ServiceUnavailableState reset={reset} />;
  }

  return (
    <ErrorState
      eyebrow="Application error"
      title="Something interrupted the product shell."
      description="Try again or return to the homepage."
      reset={reset}
      homeHref="/"
      homeLabel="Home"
    />
  );
}
