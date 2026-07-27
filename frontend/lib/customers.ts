import { Users, TrendingDown, TrendingUp, ShieldAlert } from 'lucide-react';

import type { StatCard } from '@/components/features/stat-card-grid';
import type { CustomerRecord } from '@/services/api';
import { STAT_CARD_TONE_STYLES } from '@/lib/stat-card-styles';

/** Derives the customers-page summary cards (total/healthy/at-risk/critical) from a customer list. */
export function buildCustomerSummaryCards(customers: CustomerRecord[]): StatCard[] {
  const healthy = customers.filter((c) => c.health === 'Healthy').length;
  const atRisk = customers.filter((c) => c.health === 'At-Risk').length;
  const critical = customers.filter((c) => c.health === 'Critical').length;

  return [
    { id: 'total', label: 'Total customers', value: customers.length, icon: Users, ...STAT_CARD_TONE_STYLES.neutral },
    { id: 'healthy', label: 'Healthy', value: healthy, icon: TrendingUp, ...STAT_CARD_TONE_STYLES.success },
    { id: 'at-risk', label: 'At risk', value: atRisk, icon: ShieldAlert, ...STAT_CARD_TONE_STYLES.warning },
    { id: 'critical', label: 'Critical', value: critical, icon: TrendingDown, ...STAT_CARD_TONE_STYLES.danger },
  ];
}
