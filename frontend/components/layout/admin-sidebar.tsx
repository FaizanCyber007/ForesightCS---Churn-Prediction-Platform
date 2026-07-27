'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Building2,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LogOut,
  ScrollText,
  ShieldAlert,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import { useAuth } from '@/context/auth-context';

const primaryNav = [
  {
    href: '/admin',
    label: 'Organizations',
    icon: Building2,
    exact: true,
  },
  {
    href: '/admin/audit-log',
    label: 'Audit Trail',
    icon: ScrollText,
    exact: true,
  },
];

const secondaryNav = [
  { href: '/api/v1/docs/', label: 'API Docs', icon: FileText, external: true },
  { href: '/dashboard', label: 'Back to workspace', icon: LayoutDashboard, external: false },
];

/**
 * Admin-scope counterpart to `Sidebar` (CLAUDE.md: 100% consistent design
 * system, reused UI primitives) -- same chrome and classes, different
 * (super-admin-only) navigation. Swapped into `DashboardShell` via its
 * `sidebar` prop rather than duplicating the shell itself.
 */
export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  const initials = user?.fullName
    ? user.fullName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'SA';

  return (
    <aside className="flex h-full w-full flex-col gap-4 border-r border-white/8 bg-[#080808]/90 p-5 backdrop-blur-2xl lg:w-72">
      {/* Logo + badge */}
      <div className="space-y-3">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-400/10 text-lg font-bold text-violet-200 shadow-[0_0_20px_rgba(139,92,246,0.12)] transition-all group-hover:shadow-[0_0_28px_rgba(139,92,246,0.22)]">
            F
          </div>
          <div>
            <p className="text-sm font-semibold text-white tracking-wide">ForesightCS</p>
            <p className="text-xs text-zinc-500">Platform administration</p>
          </div>
        </Link>
        <Badge variant="accent" className="w-fit">
          <ShieldAlert className="mr-1.5 h-3 w-3" />
          Super admin
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
                  ? 'border-violet-400/20 bg-violet-400/8 text-white'
                  : 'border-transparent text-zinc-400 hover:border-white/8 hover:bg-white/4 hover:text-white'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <span
                className={cn(
                  'absolute inset-y-0 left-0 w-0.5 rounded-r-full bg-gradient-to-b from-violet-400 to-emerald-300 transition-opacity',
                  active ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
                )}
              />
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0',
                  active ? 'text-violet-300' : 'text-zinc-500 group-hover:text-zinc-300'
                )}
              />
              <span className="font-medium">{item.label}</span>
              {active && <ChevronRight className="ml-auto h-3 w-3 text-violet-400/60" />}
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
          const Icon = item.icon;
          const className =
            'group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm text-zinc-500 transition-all hover:border-white/8 hover:bg-white/4 hover:text-zinc-300';
          return item.external ? (
            <a key={item.href} href={item.href} target="_blank" rel="noreferrer" className={className}>
              <Icon className="h-4 w-4 shrink-0 text-zinc-600 group-hover:text-zinc-400" />
              <span>{item.label}</span>
            </a>
          ) : (
            <Link key={item.href} href={item.href} className={className}>
              <Icon className="h-4 w-4 shrink-0 text-zinc-600 group-hover:text-zinc-400" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="mt-auto space-y-3">
        <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-emerald-500 text-xs font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {user?.fullName || 'Super Admin'}
            </p>
            <p className="truncate text-xs text-zinc-500">Platform administrator</p>
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
