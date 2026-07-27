import type { PaginatedResponse } from '@/lib/apiClient';
import { serverApiClient as apiClient } from '@/lib/serverApiClient';
import type { HealthRuleFormValues } from '@/lib/schemas';

export type MetricTypeOption = {
  value: string;
  label: string;
};

export type HealthRule = {
  id: string;
  name: string;
  metricType: string;
  metricTypeLabel: string;
  threshold: number;
  weight: number;
  isActive: boolean;
  createdAt: string;
};

type HealthRuleApiRecord = {
  id: string;
  name: string;
  metric_type: string;
  metric_type_display: string;
  threshold: string;
  weight: number;
  is_active: boolean;
  created_at: string;
};

function mapHealthRule(record: HealthRuleApiRecord): HealthRule {
  return {
    id: record.id,
    name: record.name,
    metricType: record.metric_type,
    metricTypeLabel: record.metric_type_display,
    threshold: Number(record.threshold),
    weight: record.weight,
    isActive: record.is_active,
    createdAt: record.created_at,
  };
}

export async function getHealthRules(): Promise<HealthRule[]> {
  const page = await apiClient.get<PaginatedResponse<HealthRuleApiRecord>>(
    '/api/v1/rules/?page_size=200'
  );
  return page.results.map(mapHealthRule);
}

/** Available metric types, sourced live from the backend -- never hardcoded. */
export async function getMetricTypes(): Promise<MetricTypeOption[]> {
  return apiClient.get<MetricTypeOption[]>('/api/v1/rules/metric-types/');
}

export async function createHealthRule(
  values: HealthRuleFormValues,
  idempotencyKey: string
): Promise<HealthRule> {
  const created = await apiClient.post<HealthRuleApiRecord>('/api/v1/rules/', values, {
    idempotencyKey,
  });
  return mapHealthRule(created);
}

export async function deleteHealthRule(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/rules/${id}/`);
}
