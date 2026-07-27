'use client';

import './globals.css';
import { ErrorState } from '@/components/ui/error-state';

/**
 * Catches errors thrown by the root layout itself (app/layout.tsx) --
 * app/error.tsx can't cover this since it renders *inside* that layout.
 * Next.js requires this file to render its own <html>/<body>, and it must
 * not depend on anything the failing layout provided (AuthProvider,
 * ToastProvider) since that's exactly what might be broken.
 */
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#0a0a0a] text-white">
        <ErrorState
          eyebrow="Critical error"
          title="ForesightCS failed to start."
          description={
            error.message || 'Something went wrong before the app could render. Please retry.'
          }
          reset={reset}
          homeHref="/"
          homeLabel="Home"
        />
      </body>
    </html>
  );
}
