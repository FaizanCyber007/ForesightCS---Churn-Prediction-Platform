'use client';

import { ArrowRight, Play, ShieldCheck, TrendingUp, Zap } from 'lucide-react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

import { LandingSections } from '@/components/features/landing-sections';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Button } from '@/components/ui/button';
import { DashboardMockup } from '@/components/features/dashboard-mockup';
import mockData from '@/data/mock-data.json';

const { publicStats } = mockData as typeof mockData & {
  publicStats: { value: string; label: string }[];
};

const trustBadges = [
  { icon: ShieldCheck, text: 'SOC 2 Type II' },
  { icon: TrendingUp, text: 'GDPR compliant' },
  { icon: Zap, text: 'Setup in < 1 day' },
];

export default function Home() {
  const reduceMotion = useReducedMotion();

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  };

  const fadeUp = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
  };

  return (
    <>
      {/* ─── HERO ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 lg:py-28">
        {/* Ambient glow layer */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.14),transparent_65%)]" />
          <div className="absolute right-0 top-1/4 h-[400px] w-[400px] bg-[radial-gradient(circle,rgba(139,92,246,0.1),transparent_70%)]" />
        </div>

        <PageWrapper className="relative">
          {/* ── Eyebrow badge ── */}
          <motion.div
            className="mb-8 flex justify-center"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/8 px-4 py-2 text-sm text-emerald-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              The predictive CS platform built for modern revenue teams
            </span>
          </motion.div>

          {/* ── Headline — FULL WIDTH CENTERED ── */}
          <motion.div
            className="mx-auto max-w-4xl text-center"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            <motion.h1
              variants={fadeUp}
              className="text-5xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-[72px]"
            >
              Stop discovering churn{' '}
              <span className="relative">
                <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-violet-400 bg-clip-text text-transparent">
                  on renewal day.
                </span>
                {/* Underline glow */}
                <span className="absolute -bottom-1 left-0 h-px w-full bg-gradient-to-r from-emerald-400/0 via-emerald-400/60 to-violet-400/0" />
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mx-auto mt-7 max-w-2xl text-xl leading-8 text-zinc-400"
            >
              ForesightCS monitors product usage, billing posture, support health, and engagement signals to{' '}
              <strong className="font-medium text-zinc-200">identify at-risk accounts 30–60 days early</strong>
              {' '}— so your team can intervene before churn becomes inevitable.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" variant="brand" asChild>
                <Link href="/register">
                  Start free trial — no card needed <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/login">
                  <Play className="h-4 w-4 fill-current" />
                  See it live
                </Link>
              </Button>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-wrap items-center justify-center gap-6"
            >
              {trustBadges.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-sm text-zinc-500">
                  <Icon className="h-4 w-4 text-zinc-600" />
                  {text}
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* ── PRODUCT MOCKUP — full-width below headline, Gainsight style ── */}
          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : 48, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mt-16 relative"
          >
            {/* Glow underneath mockup */}
            <div className="pointer-events-none absolute -inset-x-8 -bottom-12 top-8 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08),transparent_70%)] blur-2xl" />
            <DashboardMockup />
          </motion.div>

          {/* ── Stats row ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {publicStats.map(({ value, label }) => (
              <div
                key={label}
                className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] p-5 text-center"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.04),transparent_60%)]" />
                <p className="font-mono-numeric text-3xl font-bold text-white">{value}</p>
                <p className="mt-1 text-sm text-zinc-500">{label}</p>
              </div>
            ))}
          </motion.div>

          {/* ── Social proof ── */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.2 }}
            className="mt-8 text-center text-sm text-zinc-600"
          >
            Trusted by <span className="text-zinc-400">400+ customer success teams</span> across SaaS, fintech, and healthcare.
          </motion.p>
        </PageWrapper>
      </section>

      <LandingSections />
    </>
  );
}
