import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import DashboardLoading from '../loading';

describe('DashboardLoading', () => {
  it('renders a skeleton placeholder for every section of the real dashboard', () => {
    const { container } = render(<DashboardLoading />);

    // Every Skeleton block is aria-hidden (components/ui/skeleton.tsx) --
    // a real dashboard render has a header, four metric cards, two charts,
    // a table, and three priority-watch cards, so this should be a
    // substantial count, not just one or two placeholders.
    const skeletons = container.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBeGreaterThan(20);
  });
});
