'use client';

import { Key, Shield } from 'lucide-react';

import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SecuritySettings() {
  return (
    <div className="space-y-4">
      <GlassCard className="space-y-5 relative overflow-hidden group">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500/20 via-transparent to-transparent" />
        <div>
          <h2 className="font-semibold text-white text-base">Password &amp; Security</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Keep your security posture robust with strong passwords.</p>
        </div>
        <div className="space-y-3 pt-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-zinc-400">Current password</span>
            <Input className="h-10 text-sm" type="password" placeholder="••••••••" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-zinc-400">New password</span>
            <Input className="h-10 text-sm" type="password" placeholder="••••••••" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-zinc-400">Confirm new password</span>
            <Input className="h-10 text-sm" type="password" placeholder="••••••••" />
          </label>
        </div>
        <Button
          variant="brand"
          className="h-10 text-xs gap-1.5"
          disabled
          title="Password changes aren't wired up to the backend yet."
        >
          <Key className="h-4 w-4" /> Update password credentials
        </Button>
      </GlassCard>

      <GlassCard className="space-y-4">
        <div>
          <h2 className="font-semibold text-white text-base">Two-factor authentication</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Add an extra verification shield to your workspace.</p>
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/5 bg-black/20 text-zinc-500">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Authenticator app (TOTP)</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Not configured</p>
            </div>
          </div>
          <Button variant="secondary" size="xs">Configure 2FA</Button>
        </div>
      </GlassCard>
    </div>
  );
}
