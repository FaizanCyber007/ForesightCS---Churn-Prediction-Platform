'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Home, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#080808] px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.05),transparent_70%)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative max-w-md text-center space-y-8"
      >
        <div>
          <p className="font-mono-numeric text-8xl font-bold tracking-tight text-white/10 select-none">404</p>
          <div className="-mt-8 space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-white">Page not found</h1>
            <p className="text-zinc-400">
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
          </div>
        </div>

        <GlassCard className="flex items-center gap-3 text-left">
          <Search className="h-5 w-5 shrink-0 text-zinc-500" />
          <div>
            <p className="text-sm text-zinc-300">Looking for your dashboard?</p>
            <p className="text-xs text-zinc-500">Sign in to access your account health data.</p>
          </div>
        </GlassCard>

        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="brand" asChild>
            <Link href="/">
              <Home className="h-4 w-4" /> Go home
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/login">
              <ArrowLeft className="h-4 w-4" /> Sign in
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
