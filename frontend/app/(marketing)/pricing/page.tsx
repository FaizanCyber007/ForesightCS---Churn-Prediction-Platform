import type { Metadata } from 'next';

import { PricingContent } from './pricing-content';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing for predictive customer success. Start free and scale with your team.',
};

export default function PricingPage() {
  return <PricingContent />;
}