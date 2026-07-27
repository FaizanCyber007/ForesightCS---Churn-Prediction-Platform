'use client';

import { cn } from '@/lib/cn';

export type NotificationPref = {
  label: string;
  description: string;
  defaultOn: boolean;
};

export function NotificationToggle({
  pref,
  on,
  onChange,
}: {
  pref: NotificationPref;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/8 bg-black/20 px-4 py-3">
      <div>
        <p className="text-xs font-semibold text-white">{pref.label}</p>
        <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">{pref.description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        data-state={on ? 'checked' : 'unchecked'}
        onClick={() => onChange(!on)}
        className={cn(
          'h-5 w-9 rounded-full border transition-colors flex items-center',
          on ? 'border-emerald-400/30 bg-emerald-500/80' : 'border-white/15 bg-white/10'
        )}
        aria-label={`Toggle ${pref.label}`}
      >
        <span className={cn(
          'block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
          on ? 'translate-x-4' : 'translate-x-0.5'
        )} />
      </button>
    </div>
  );
}
