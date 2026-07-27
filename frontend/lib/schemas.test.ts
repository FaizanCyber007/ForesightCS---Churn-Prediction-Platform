import { describe, expect, it } from 'vitest';

import { customerSchema, healthRuleSchema } from '@/lib/schemas';

describe('healthRuleSchema', () => {
  const valid = { name: 'Login drop watchlist', metric_type: 'login', threshold: 25, weight: 15 };

  it('accepts a valid rule', () => {
    const result = healthRuleSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects a rule name shorter than 3 characters', () => {
    const result = healthRuleSchema.safeParse({ ...valid, name: 'ab' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty metric_type', () => {
    const result = healthRuleSchema.safeParse({ ...valid, metric_type: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a negative threshold', () => {
    const result = healthRuleSchema.safeParse({ ...valid, threshold: -1 });
    expect(result.success).toBe(false);
  });

  it.each([0, -5, 101, 500])('rejects weight %i outside 1-100', (weight) => {
    const result = healthRuleSchema.safeParse({ ...valid, weight });
    expect(result.success).toBe(false);
  });

  it('rejects a non-integer weight', () => {
    const result = healthRuleSchema.safeParse({ ...valid, weight: 4.5 });
    expect(result.success).toBe(false);
  });

  it('coerces numeric strings for threshold and weight', () => {
    const result = healthRuleSchema.safeParse({ ...valid, threshold: '25', weight: '15' });
    expect(result.success).toBe(true);
  });
});

describe('customerSchema', () => {
  const valid = {
    name: 'Jane Doe',
    company_name: 'Acme Inc',
    segment: 'SMB',
    plan: 'Starter',
    mrr: 1000,
    annual_contract_value: 12000,
    renewal_date: '2027-01-01',
    nps: 0,
    expansion_potential: 0,
  };

  it('accepts a valid customer', () => {
    expect(customerSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an unknown segment', () => {
    const result = customerSchema.safeParse({ ...valid, segment: 'Not A Real Segment' });
    expect(result.success).toBe(false);
  });

  it('rejects a negative mrr', () => {
    const result = customerSchema.safeParse({ ...valid, mrr: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects nps outside -100 to 100', () => {
    expect(customerSchema.safeParse({ ...valid, nps: 150 }).success).toBe(false);
    expect(customerSchema.safeParse({ ...valid, nps: -150 }).success).toBe(false);
  });

  it('rejects a blank renewal date', () => {
    const result = customerSchema.safeParse({ ...valid, renewal_date: '' });
    expect(result.success).toBe(false);
  });
});
