'use client';

import { Bell, Search, User } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAuth } from '@/context/auth-context';

import { CommandPalette, type CommandItem } from '@/components/ui/command-palette';

const commandItems: CommandItem[] = [
  // Navigation
  { id: 'nav-dashboard', label: 'Command Center', hint: 'Overview & metrics', group: 'Navigation', href: '/dashboard' },
  { id: 'nav-customers', label: 'Customers', hint: 'Full customer portfolio', group: 'Navigation', href: '/dashboard/customers' },
  { id: 'nav-analytics', label: 'Analytics', hint: 'Health trends & charts', group: 'Navigation', href: '/dashboard/analytics' },
  { id: 'nav-playbooks', label: 'Playbooks', hint: 'Automated workflows', group: 'Navigation', href: '/dashboard/playbooks' },
  { id: 'nav-rules', label: 'Rule Builder', hint: 'Configure churn rules', group: 'Navigation', href: '/dashboard/rules/new' },
  { id: 'nav-settings', label: 'Settings', hint: 'Profile & workspace', group: 'Navigation', href: '/dashboard/settings' },
  // Customers
  { id: 'cust-acme', label: 'Acme Cloud', hint: 'Healthy · Mid-Market', group: 'Customers', href: '/dashboard/customer/acme-cloud' },
  { id: 'cust-northstar', label: 'Northstar Health', hint: 'At-Risk · SMB', group: 'Customers', href: '/dashboard/customer/northstar-health' },
  { id: 'cust-atlas', label: 'Atlas Retail', hint: 'Critical · Enterprise', group: 'Customers', href: '/dashboard/customer/atlas-retail' },
  { id: 'cust-bluepine', label: 'Bluepine Studio', hint: 'Healthy · SMB', group: 'Customers', href: '/dashboard/customer/bluepine-studio' },
  { id: 'cust-orbit', label: 'Orbit Finance', hint: 'At-Risk · Mid-Market', group: 'Customers', href: '/dashboard/customer/orbit-finance' },
  { id: 'cust-summit', label: 'Summit Ops', hint: 'Healthy · Expansion', group: 'Customers', href: '/dashboard/customer/summit-ops' },
];

export function DashboardHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [cmdOpen, setCmdOpen] = useState(false);

  // Create breadcrumbs based on pathname
  const paths = pathname.split('/').filter(Boolean);
  const breadcrumbs = paths.map((path, index) => {
    const isLast = index === paths.length - 1;
    const label = path.replace(/-/g, ' ');
    return {
      label: label.charAt(0).toUpperCase() + label.slice(1),
      isLast,
    };
  });

  return (
    <>
      <CommandPalette items={commandItems} open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <div className="flex h-16 w-full items-center justify-between px-6">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          {breadcrumbs.map((crumb, i) => (
            <div key={crumb.label + i} className="flex items-center gap-2">
              {i > 0 && <span className="text-zinc-600">/</span>}
              <span className={crumb.isLast ? 'text-white font-medium' : 'hover:text-zinc-200 transition-colors'}>
                {crumb.label}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Search triggers CommandPalette */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className="h-9 w-64 cursor-text rounded-full border border-white/10 bg-white/5 pl-9 pr-4 text-left text-sm text-zinc-500 transition-all hover:border-white/20 hover:bg-white/8 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
              aria-label="Open command palette)"
            >
              Search…{' '}
            </button>
          </div>
          {/* Mobile search button */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
            onClick={() => setCmdOpen(true)}
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
            aria-label="Notifications"
            title="No notifications yet"
          >
            <Bell className="h-4 w-4" />
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-violet-500 text-sm font-medium text-white shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
            onClick={() => router.push('/dashboard/settings')}
            aria-label="Open account settings"
          >
            <User className="h-4 w-4" />
          </button>
          <button
            className="hidden sm:flex h-9 px-3 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/10 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50"
            onClick={() => { logout(); router.push('/'); }}
            aria-label="Log out"
          >
            Log out
          </button>
        </div>
      </div>
    </>
  );
}