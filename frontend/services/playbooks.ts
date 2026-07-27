import type { PaginatedResponse } from '@/lib/apiClient';
import { serverApiClient as apiClient } from '@/lib/serverApiClient';
import type { PlaybookFormValues } from '@/lib/schemas';

export type Playbook = {
  id: string;
  name: string;
  description: string;
  trigger: string;
  status: 'active' | 'inactive';
  customersInPlay: number;
  lastTriggered: string | null;
  steps: string[];
  createdAt: string;
};

type PlaybookApiRecord = {
  id: string;
  name: string;
  description: string;
  trigger: string;
  status: 'active' | 'inactive';
  customers_in_play: number;
  last_triggered: string | null;
  steps: string[];
  created_at: string;
};

function mapPlaybook(record: PlaybookApiRecord): Playbook {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    trigger: record.trigger,
    status: record.status,
    customersInPlay: record.customers_in_play,
    lastTriggered: record.last_triggered,
    steps: record.steps,
    createdAt: record.created_at,
  };
}

export async function getPlaybooks(): Promise<Playbook[]> {
  const page = await apiClient.get<PaginatedResponse<PlaybookApiRecord>>(
    '/api/v1/playbooks/?page_size=200'
  );
  return page.results.map(mapPlaybook);
}

export async function createPlaybook(
  values: PlaybookFormValues,
  idempotencyKey: string
): Promise<Playbook> {
  const created = await apiClient.post<PlaybookApiRecord>('/api/v1/playbooks/', values, {
    idempotencyKey,
  });
  return mapPlaybook(created);
}

export async function updatePlaybook(
  id: string,
  values: PlaybookFormValues
): Promise<Playbook> {
  const updated = await apiClient.patch<PlaybookApiRecord>(`/api/v1/playbooks/${id}/`, values);
  return mapPlaybook(updated);
}
