'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/contact', label: 'Contact' },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/8 bg-black/70 backdrop-blur-2xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 text-white group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.2)] transition-all group-hover:shadow-[0_0_32px_rgba(16,185,129,0.35)]">
              <span className="text-sm font-bold">F</span>
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.2em] text-white/90">FORESIGHTCS</p>
              <p className="text-[10px] uppercase tracking-[0.35em] text-zinc-500">Revenue intelligence</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-8 md:flex">
            <nav className="flex items-center gap-6 text-sm">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'transition-colors hover:text-white',
                    pathname === link.href ? 'text-white' : 'text-zinc-400'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="h-5 w-px bg-white/10" />

            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button variant="brand" size="sm" asChild>
                <Link href="/register">Start free trial</Link>
              </Button>
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              key="drawer"
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="fixed right-0 top-0 z-40 flex h-full w-72 flex-col gap-6 border-l border-white/10 bg-[#080808]/98 p-6 backdrop-blur-2xl md:hidden"
            >
              <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2.5 text-white" onClick={() => setMobileOpen(false)}>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
                    <span className="text-xs font-bold">F</span>
                  </div>
                  <span className="text-sm font-semibold tracking-wide">ForesightCS</span>
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 hover:text-white"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="flex flex-col gap-1.5">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'rounded-xl border px-4 py-3 text-sm transition-colors',
                      pathname === link.href
                        ? 'border-emerald-400/20 bg-emerald-400/8 text-white'
                        : 'border-white/5 bg-white/3 text-zinc-300 hover:border-white/10 hover:text-white'
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-auto flex flex-col gap-3">
                <Button variant="secondary" asChild className="w-full">
                  <Link href="/login" onClick={() => setMobileOpen(false)}>Sign in</Link>
                </Button>
                <Button variant="brand" asChild className="w-full">
                  <Link href="/register" onClick={() => setMobileOpen(false)}>Start free trial</Link>
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
