'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Building2,
  CheckSquare,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldAlert,
  Users,
  Zap,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import { useAuth } from '@/context/auth-context';

const primaryNav = [
  {
    href: '/dashboard',
    label: 'Command Center',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: '/dashboard/tasks',
    label: 'Inbox / Tasks',
    icon: CheckSquare,
    exact: false,
  },
  {
    href: '/dashboard/customers',
    label: 'Customers',
    icon: Users,
    exact: false,
  },
  {
    href: '/dashboard/analytics',
    label: 'Analytics',
    icon: BarChart3,
    exact: false,
  },
  {
    href: '/dashboard/playbooks',
    label: 'Playbooks',
    icon: ShieldAlert,
    exact: false,
  },
  {
    href: '/dashboard/rules',
    label: 'Health Rules',
    icon: Zap,
    exact: false,
  },
];

const baseSecondaryNav = [
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  // Super Admin Hub is only ever visible to a real platform superuser
  // (CLAUDE.md ##1 Super Admin Bypass) -- everyone else never even sees
  // the link exists.
  const secondaryNav = user?.isSuperuser
    ? [...baseSecondaryNav, { href: '/admin', label: 'Super Admin Hub', icon: Building2 }]
    : baseSecondaryNav;

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  const initials = user?.fullName
    ? user.fullName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'CS';

  return (
    <aside className="flex h-full w-full flex-col gap-4 border-r border-white/8 bg-[#080808]/90 p-5 backdrop-blur-2xl lg:w-72">
      {/* Logo + badge */}
      <div className="space-y-3">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 text-lg font-bold text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.12)] transition-all group-hover:shadow-[0_0_28px_rgba(16,185,129,0.22)]">
            F
          </div>
          <div>
            <p className="text-sm font-semibold text-white tracking-wide">ForesightCS</p>
            <p className="text-xs text-zinc-500">Customer retention OS</p>
          </div>
        </Link>
        <Badge variant="success" className="w-fit">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
          Live · signal fusion v4
        </Badge>
      </div>

      {/* Primary nav */}
      <nav className="flex flex-col gap-0.5" aria-label="Primary navigation">
        <p className="mb-1 px-3 text-xs uppercase tracking-[0.35em] text-zinc-600">Navigation</p>
        {primaryNav.map((item) => {
          const active = isActive(item.href, item.exact ?? false);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 text-sm transition-all duration-200',
                active
                  ? 'border-emerald-400/20 bg-emerald-400/8 text-white'
                  : 'border-transparent text-zinc-400 hover:border-white/8 hover:bg-white/4 hover:text-white'
              )}
              aria-current={active ? 'page' : undefined}
            >
              {/* Active accent bar */}
              <span
                className={cn(
                  'absolute inset-y-0 left-0 w-0.5 rounded-r-full bg-gradient-to-b from-emerald-300 to-violet-400 transition-opacity',
                  active ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
                )}
              />
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0',
                  active ? 'text-emerald-300' : 'text-zinc-500 group-hover:text-zinc-300'
                )}
              />
              <span className="font-medium">{item.label}</span>
              {active && (
                <ChevronRight className="ml-auto h-3 w-3 text-emerald-400/60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="border-t border-white/8" />

      {/* Secondary nav */}
      <nav className="flex flex-col gap-0.5" aria-label="Secondary navigation">
        <p className="mb-1 px-3 text-xs uppercase tracking-[0.35em] text-zinc-600">Workspace</p>
        {secondaryNav.map((item) => {
          const active = isActive(item.href, false);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-all',
                active
                  ? 'border-emerald-400/20 bg-emerald-400/8 text-white'
                  : 'border-transparent text-zinc-500 hover:border-white/8 hover:bg-white/4 hover:text-zinc-300'
              )}
            >
              <Icon className="h-4 w-4 shrink-0 text-zinc-600 group-hover:text-zinc-400" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="mt-auto space-y-3">
        <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-violet-500 text-xs font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {user?.fullName || 'CS User'}
            </p>
            <p className="truncate text-xs text-zinc-500">
              {user?.title || user?.role || 'CSM'} · {user?.companyName || 'Enterprise'}
            </p>
          </div>
          <button
            onClick={() => {
              logout();
              router.push('/');
            }}
            className="shrink-0 text-zinc-500 transition-colors hover:text-rose-300"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
