'use client';

import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

const pricing = [
  {
    name: 'Starter',
    price: '$49',
    period: '/mo',
    detail: 'For lean teams getting signal coverage live.',
    features: [
      'Up to 500 accounts',
      'Basic health scoring',
      'Standard playbooks',
      '5 churn rules',
      'Email support',
    ],
    cta: 'Start free trial',
    highlighted: false,
  },
  {
    name: 'Growth',
    price: '$149',
    period: '/mo',
    detail: 'For teams scaling predictive playbooks and automation.',
    features: [
      'Up to 2,500 accounts',
      'Predictive ML churn model',
      'Advanced automation',
      'Unlimited churn rules',
      'Priority support',
      'AI Copilot (beta)',
    ],
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    detail: 'For multi-team CS operations and data integrations.',
    features: [
      'Unlimited accounts',
      'Custom model weights',
      'Dedicated CSM',
      'SSO & SLA',
      'On-prem option',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

export function PricingContent() {
  const reduceMotion = useReducedMotion();

  return (
    <div>
    <section className="relative overflow-hidden py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.07),transparent_65%)]" />
      <PageWrapper className="relative space-y-16">
        <div className="mx-auto max-w-2xl space-y-4 text-center">
          <p className="text-sm uppercase tracking-[0.4em] text-violet-300">Pricing</p>
          <h1 className="text-5xl font-semibold tracking-tight text-white">
            Pricing that scales with your retention.
          </h1>
          <p className="text-lg text-zinc-400">
            Start lean, build your signal coverage, and upgrade when your team needs advanced predictive models.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3">
          {pricing.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              whileHover={reduceMotion ? undefined : { y: -6 }}
              className="relative"
            >
              {/* Badge rendered OUTSIDE the card so it doesn't get clipped */}
              {tier.highlighted && (
                <div className="absolute -top-4 left-1/2 z-10 -translate-x-1/2">
                  <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-[#0d1810] px-3 py-1 text-xs text-emerald-200 shadow-[0_0_16px_rgba(16,185,129,0.3)]">
                    <Sparkles className="h-3 w-3" />
                    Most popular
                  </span>
                </div>
              )}
              <div
                className={cn(
                  'flex h-full flex-col space-y-6 rounded-[24px] border p-7',
                  tier.highlighted
                    ? 'border-emerald-400/30 bg-emerald-400/5 pt-10 shadow-[0_0_60px_rgba(16,185,129,0.1)]'
                    : 'border-white/8 bg-white/[0.03]'
                )}
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
                    {tier.name}
                  </p>
                  <div className="mt-3 flex items-end gap-1">
                    <p className="font-mono-numeric text-5xl font-bold text-white">
                      {tier.price}
                    </p>
                    {tier.period && (
                      <p className="mb-1.5 text-lg text-zinc-500">{tier.period}</p>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-zinc-400">
                    {tier.detail}
                  </p>
                </div>

                <div className="flex-1 space-y-3">
                  {tier.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2.5">
                      <CheckCircle2
                        className={cn(
                          'h-4 w-4 shrink-0',
                          tier.highlighted ? 'text-emerald-400' : 'text-zinc-600'
                        )}
                      />
                      <span className="text-sm text-zinc-300">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full"
                  variant={tier.highlighted ? 'brand' : 'secondary'}
                  asChild
                >
                  <Link href={tier.price === 'Custom' ? '/contact' : '/register'}>
                    {tier.cta}
                  </Link>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm text-zinc-500">
            All plans include a 14-day free trial. No credit card required.{' '}
            <Link href="/contact" className="text-emerald-300 transition-colors hover:text-emerald-200">
              Talk to sales →
            </Link>
          </p>
        </div>
      </PageWrapper>
    </section>
      <section className="relative border-t border-white/5">
        <PageWrapper className="relative py-28">
          <motion.div
            className="relative mx-auto max-w-4xl overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03] backdrop-blur-xl p-12 text-center shadow-2xl"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Ambient glow */}
            <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-emerald-400/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/4 h-48 w-48 rounded-full bg-violet-400/10 blur-3xl" />

            <div className="relative space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/8 px-4 py-1.5 text-sm text-emerald-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                Free 14-day trial — no credit card
              </span>
              <h2 className="text-4xl font-semibold tracking-tight text-white lg:text-5xl">
                Start protecting your revenue today
              </h2>
              <p className="mx-auto max-w-xl text-lg text-zinc-400">
                Join 400+ CS teams using ForesightCS to identify churn risk weeks before it becomes a cancellation call.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <Button size="xl" variant="brand" asChild>
                  <Link href="/register">
                    Get started free <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="xl" variant="secondary" asChild>
                  <Link href="/contact">Talk to sales</Link>
                </Button>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-sm text-zinc-500">
                {['SOC 2 Type II', 'GDPR compliant', 'Setup in under a day', 'Cancel anytime'].map((item) => (
                  <div key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-zinc-600" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </PageWrapper>
      </section>
      </div>
  );
}
