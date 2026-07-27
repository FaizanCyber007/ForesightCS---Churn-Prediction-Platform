'use client';

import { useState, useEffect } from 'react';
import { Menu, ShieldAlert } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

import { Sidebar } from '@/components/layout/sidebar';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';

export function DashboardShell({
  children,
  sidebar = <Sidebar />,
  requireSuperuser = false,
}: {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  /** Gate this shell to platform superusers only (see app/admin/layout.tsx). */
  requireSuperuser?: boolean;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const isForbidden = requireSuperuser && !user?.isSuperuser;

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (isForbidden) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, isForbidden, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="text-center space-y-4">
          <div className="relative flex h-14 w-14 mx-auto items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/5 text-emerald-300 animate-pulse">
            <span className="text-lg font-bold">F</span>
          </div>
          <p className="text-zinc-500 text-sm tracking-wider uppercase">Loading security posture...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] p-6">
        <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-[#0d0f12]/90 p-8 text-center backdrop-blur-2xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-white">Access Denied</h2>
          <p className="mt-2 text-sm text-zinc-400">
            You must be logged into your workspace to view the customer success command center.
          </p>
          <div className="mt-6">
            <Button className="w-full" onClick={() => router.push('/login')}>
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isForbidden) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] p-6">
        <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-[#0d0f12]/90 p-8 text-center backdrop-blur-2xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-white">Super Admin Access Only</h2>
          <p className="mt-2 text-sm text-zinc-400">
            This area is restricted to ForesightCS platform superusers.
          </p>
          <div className="mt-6">
            <Button className="w-full" onClick={() => router.push('/dashboard')}>
              Back to your workspace
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white lg:grid lg:grid-cols-[280px_1fr]">
      {/* Desktop sidebar — sticky full height */}
      <div className="hidden lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto border-r border-white/10">
          {sidebar}
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              key="mobile-sidebar"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-80 lg:hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {sidebar}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Right column: header + main */}
      <div className="flex min-w-0 flex-col relative overflow-hidden">
        {/* Ambient radial glows behind all dashboard screens */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute right-0 top-0 h-[400px] w-[600px] bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.06),rgba(139,92,246,0.04),transparent_60%)]" />
          <div className="absolute left-1/4 bottom-0 h-[300px] w-[500px] bg-[radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.04),transparent_65%)]" />
          {/* Subtle grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:48px_48px]" />
        </div>

        <div className="sticky top-0 z-40 flex items-center gap-0 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl">
          {/* Mobile burger — only visible on small screens */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-16 w-14 shrink-0 items-center justify-center text-zinc-400 transition-colors hover:text-white lg:hidden"
            aria-label="Open sidebar navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          {/* Header fills remaining space */}
          <div className="flex-1">
            <DashboardHeader />
          </div>
        </div>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
