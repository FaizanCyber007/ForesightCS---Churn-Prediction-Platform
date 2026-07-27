'use client';

import { useState } from 'react';

import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { NotificationToggle, type NotificationPref } from '@/components/features/settings/notification-toggle';

const notificationPrefs: NotificationPref[] = [
  { label: 'Critical risk alerts', description: 'Notify when a customer reaches Critical status', defaultOn: true },
  { label: 'Renewal reminders', description: 'Alert 90, 60, and 30 days before renewal', defaultOn: true },
  { label: 'Playbook triggers', description: 'Notify when a playbook activates on your customers', defaultOn: false },
  { label: 'Weekly digest', description: 'Summary of portfolio health every Monday', defaultOn: true },
];

export function NotificationSettings() {
  const [prefs, setPrefs] = useState(() =>
    Object.fromEntries(notificationPrefs.map((pref) => [pref.label, pref.defaultOn]))
  );

  return (
    <GlassCard className="space-y-6 relative overflow-hidden group">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500/20 via-transparent to-transparent" />
      <div>
        <h2 className="font-semibold text-white text-base">Notification triggers</h2>
        <p className="text-xs text-zinc-400 mt-0.5">Select when your team should receive slack and email notifications.</p>
      </div>
      <div className="space-y-2.5">
        {notificationPrefs.map((pref) => (
          <NotificationToggle
            key={pref.label}
            pref={pref}
            on={prefs[pref.label]}
            onChange={(next) => setPrefs((current) => ({ ...current, [pref.label]: next }))}
          />
        ))}
      </div>
      <Button variant="brand" className="h-10 text-xs" disabled title="Notification preferences aren't persisted yet.">
        Save notification settings
      </Button>
    </GlassCard>
  );
}
