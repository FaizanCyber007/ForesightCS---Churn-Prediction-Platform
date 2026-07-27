'use client';
import {
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Target,
  Users,
  Zap,
  TrendingDown,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

import { PageWrapper } from '@/components/layout/page-wrapper';
import mockData from '@/data/mock-data.json';

const { landingTestimonials } = mockData as typeof mockData & {
  landingTestimonials: { quote: string; name: string; title: string; company: string }[];
  integrations: { name: string; category: string }[];
};

// ─── Data ──────────────────────────────────────────────────────────

const features = [
  {
    icon: BrainCircuit,
    title: 'Predictive churn scoring — 30 to 60 days out',
    description:
      'Our ML model scores every account daily using signals from product usage, billing events, support intensity, and engagement frequency. No data science team needed.',
    highlight: true,
    stat: '81% accuracy',
    color: 'emerald',
  },
  {
    icon: BarChart3,
    title: 'Revenue command center',
    description:
      'See retained ARR, expansion pipeline, and at-risk MRR all in one place. Stop building churn reports in spreadsheets the night before board meetings.',
    highlight: false,
    stat: '$1.84M avg ARR protected',
    color: 'violet',
  },
  {
    icon: ShieldCheck,
    title: 'Automated save-play playbooks',
    description:
      'When an account crosses a risk threshold, ForesightCS automatically assigns the right playbook — executive outreach, QBR scheduling, or renewal prep — with deadlines and owners.',
    highlight: false,
    stat: '4.3x faster interventions',
    color: 'blue',
  },
  {
    icon: Users,
    title: 'Customer 360 & Interactive Timeline',
    description:
      'Every account has a live profile: health score, key contacts, support trends, and an interactive timeline where you can log notes and activities directly from the UI.',
    highlight: false,
    stat: 'Zero tab-switching',
    color: 'amber',
  },
  {
    icon: Zap,
    title: 'No-code churn rule builder',
    description:
      "Encode your team's institutional knowledge into weighted signal rules. Set custom thresholds for product adoption, login frequency, NPS drops, and more — in minutes.",
    highlight: false,
    stat: 'Unlimited rules on Growth+',
    color: 'rose',
  },
  {
    icon: CheckCircle2,
    title: 'Actionable Inbox & Tasks Workflow',
    description:
      'A unified workflow module that aggregates system alerts, playbook deadlines, and manual tasks into a prioritized, actionable inbox with optimistic UI updates.',
    highlight: false,
    stat: 'Prioritized daily workflow',
    color: 'teal',
  },
];

const colorMap: Record<string, { icon: string; stat: string; border: string; glow: string }> = {
  emerald: { icon: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20', stat: 'text-emerald-300 bg-emerald-400/8 border-emerald-400/20', border: 'border-emerald-400/25 bg-emerald-400/5', glow: 'shadow-[0_0_40px_rgba(52,211,153,0.1)]' },
  violet: { icon: 'text-violet-300 bg-violet-400/10 border-violet-400/20', stat: 'text-violet-300 bg-violet-400/8 border-violet-400/20', border: '', glow: '' },
  blue: { icon: 'text-blue-300 bg-blue-400/10 border-blue-400/20', stat: 'text-blue-300 bg-blue-400/8 border-blue-400/20', border: '', glow: '' },
  amber: { icon: 'text-amber-300 bg-amber-400/10 border-amber-400/20', stat: 'text-amber-300 bg-amber-400/8 border-amber-400/20', border: '', glow: '' },
  rose: { icon: 'text-rose-300 bg-rose-400/10 border-rose-400/20', stat: 'text-rose-300 bg-rose-400/8 border-rose-400/20', border: '', glow: '' },
  teal: { icon: 'text-teal-300 bg-teal-400/10 border-teal-400/20', stat: 'text-teal-300 bg-teal-400/8 border-teal-400/20', border: '', glow: '' },
};

const painPoints = [
  { icon: TrendingDown, text: 'Discovering churn risk 2 weeks before renewal' },
  { icon: AlertTriangle, text: 'Patchwork spreadsheets for health scoring' },
  { icon: Clock, text: 'No time to proactively engage at-risk accounts' },
  { icon: Target, text: 'Gut-feel save-plays with no data backing' },
];

// ─── Section components ──────────────────────────────────────────────

function SectionLabel({ children, color = 'emerald' }: { children: React.ReactNode; color?: string }) {
  const cls = color === 'violet' ? 'text-violet-300' : color === 'amber' ? 'text-amber-300' : 'text-emerald-300';
  return <p className={`text-sm uppercase tracking-[0.4em] ${cls}`}>{children}</p>;
}

function useScrollAnim(reduceMotion: boolean | null) {
  return {
    initial: { opacity: 0, y: reduceMotion ? 0 : 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' } as const,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  };
}

// ─── Main component ──────────────────────────────────────────────────

export function LandingSections() {
  const reduceMotion = useReducedMotion();
  const scrollAnim = useScrollAnim(reduceMotion);

  return (
    <div className="space-y-0">

      {/* ═══════════════════════════════════════════════════════════
          SECTION 1 — Pain points / Before state
          Full-width dark band, split layout
      ══════════════════════════════════════════════════════════ */}
      <section className="relative border-t border-white/5 bg-black/40 backdrop-blur-[2px] py-24 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_right,rgba(239,68,68,0.05),transparent_60%)]" />
        <PageWrapper>
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            {/* Left — copy */}
            <motion.div className="space-y-8" {...scrollAnim}>
              <div className="space-y-4">
                <SectionLabel>The problem</SectionLabel>
                <h2 className="text-4xl font-semibold tracking-tight text-white leading-tight">
                  Your customers are leaving.<br />
                  <span className="text-zinc-500">You&apos;re finding out too late.</span>
                </h2>
                <p className="text-lg text-zinc-400 leading-8">
                  Most CS teams manage churn reactively — fielding cancellation calls, fighting fires, and hoping the renewal comes through. Sound familiar?
                </p>
              </div>
              <div className="space-y-3">
                {painPoints.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.text}
                      initial={{ opacity: 0, x: -16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08, duration: 0.4 }}
                      className="flex items-center gap-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10">
                        <Icon className="h-4 w-4 text-rose-400" />
                      </div>
                      <p className="text-zinc-300">{item.text}</p>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Right — "after" state visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="relative"
            >
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-sm font-medium text-white">ForesightCS early warning — <span className="text-emerald-300">47 days before renewal</span></p>
                </div>
                {[
                  { company: 'Meridian SaaS', score: 18, risk: '81%', signal: 'API usage dropped 74%', color: 'rose' },
                  { company: 'BrightCore Inc.', score: 47, risk: '43%', signal: 'Login frequency -31% WoW', color: 'amber' },
                  { company: 'Atlas Finance', score: 62, risk: '29%', signal: 'Support tickets +3x', color: 'amber' },
                ].map((acct) => (
                  <div key={acct.company} className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/30 p-3">
                    <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${acct.color === 'rose' ? 'bg-rose-400' : 'bg-amber-400'} animate-pulse`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-white truncate">{acct.company}</p>
                        <span className={`text-[10px] font-semibold ${acct.color === 'rose' ? 'text-rose-400' : 'text-amber-400'}`}>
                          {acct.risk} risk
                        </span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/8">
                        <div className={`h-full rounded-full ${acct.color === 'rose' ? 'bg-rose-500' : 'bg-amber-400'}`} style={{ width: `${acct.score}%` }} />
                      </div>
                      <p className="mt-1 text-[10px] text-zinc-500">{acct.signal}</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/8 p-3">
                  <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
                  <p className="text-xs text-emerald-300">3 save-play playbooks launched automatically</p>
                </div>
              </div>
            </motion.div>
          </div>
        </PageWrapper>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2 — How It Works (3-col cards with step visuals)
      ══════════════════════════════════════════════════════════ */}
      <section className="relative border-t border-white/5 py-28 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.06),transparent_70%)]" />
        <PageWrapper className="space-y-16">
          <motion.div className="text-center space-y-4" {...scrollAnim}>
            <SectionLabel>How it works</SectionLabel>
            <h2 className="text-4xl font-semibold tracking-tight text-white">
              From signal to save-play in three steps
            </h2>
            <p className="mx-auto max-w-2xl text-zinc-400">
              Most CS teams discover churn risk too late. ForesightCS surfaces it early enough to do something about it — automatically.
            </p>
          </motion.div>

          {/* Connector line (desktop only) */}
          <div className="relative">
            <div className="pointer-events-none absolute top-[52px] left-[calc(16.6%+16px)] right-[calc(16.6%+16px)] hidden h-px bg-gradient-to-r from-transparent via-emerald-400/25 to-transparent lg:block" />

            <div className="grid gap-6 lg:grid-cols-3">

              {/* ── Step 01 — Connect your signals ── */}
              <motion.div
                initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0 }}
              >
                <div className="h-full rounded-[28px] border border-white/10 bg-white/[0.03] p-6 space-y-5 hover:border-white/16 hover:bg-white/[0.05] transition-colors">
                  {/* Step badge */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10 font-mono-numeric text-sm font-bold text-emerald-300">
                      01
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-emerald-400/20 to-transparent" />
                  </div>

                  {/* Illustration — integration sources flowing in */}
                  <div className="rounded-2xl border border-white/8 bg-black/25 p-4 space-y-2">
                    <p className="text-[9px] uppercase tracking-wider text-zinc-600 mb-3">Signal sources</p>
                    {[
                      { name: 'Salesforce', cat: 'CRM', color: '#60a5fa' },
                      { name: 'Stripe', cat: 'Billing', color: '#a78bfa' },
                      { name: 'Zendesk', cat: 'Support', color: '#34d399' },
                      { name: 'Mixpanel', cat: 'Product', color: '#fb923c' },
                    ].map((src, i) => (
                      <motion.div
                        key={src.name}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                        className="flex items-center gap-2.5"
                      >
                        <div className="h-6 w-6 shrink-0 rounded-lg border border-white/8 flex items-center justify-center text-[9px] font-bold" style={{ color: src.color, backgroundColor: `${src.color}15` }}>
                          {src.name[0]}
                        </div>
                        <span className="flex-1 text-xs text-zinc-300">{src.name}</span>
                        <span className="text-[9px] text-zinc-600 border border-white/8 rounded px-1.5 py-0.5">{src.cat}</span>
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      </motion.div>
                    ))}
                    <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <p className="text-[9px] text-emerald-400">4 sources syncing live</p>
                    </div>
                  </div>

                  {/* Copy */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">Connect your signals</h3>
                    <p className="text-sm text-zinc-400 leading-6">
                      Integrate product telemetry, billing events, support data, and CRM context into one unified health layer in minutes.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* ── Step 02 — Predict risk early ── */}
              <motion.div
                initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.12 }}
              >
                <div className="h-full rounded-[28px] border border-emerald-400/20 bg-emerald-400/[0.03] p-6 space-y-5 shadow-[0_0_40px_rgba(16,185,129,0.07)] hover:border-emerald-400/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/35 bg-emerald-400/15 font-mono-numeric text-sm font-bold text-emerald-300">
                      02
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-emerald-400/30 to-transparent" />
                  </div>

                  {/* Illustration — account health score card */}
                  <div className="rounded-2xl border border-white/8 bg-black/25 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] uppercase tracking-wider text-zinc-600">Account: Meridian SaaS</p>
                      <span className="text-[9px] border border-rose-500/30 bg-rose-500/15 text-rose-300 rounded px-1.5 py-0.5">Critical</span>
                    </div>
                    {/* Score gauge */}
                    <div className="text-center py-2">
                      <motion.p
                        className="font-mono-numeric text-4xl font-bold text-rose-400"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                      >
                        18
                      </motion.p>
                      <p className="text-[10px] text-zinc-500">Health score / 100</p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/8">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-rose-600 to-rose-400"
                        initial={{ width: 0 }}
                        whileInView={{ width: '18%' }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.6, duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { signal: 'API usage', val: '-74%', bad: true },
                        { signal: 'Logins', val: '-52%', bad: true },
                        { signal: 'Support tickets', val: '+3x', bad: true },
                      ].map((s) => (
                        <div key={s.signal} className="flex items-center justify-between text-[10px]">
                          <span className="text-zinc-500">{s.signal}</span>
                          <span className="text-rose-400 font-semibold">{s.val}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 rounded-lg border border-amber-400/20 bg-amber-400/8 px-2 py-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <p className="text-[9px] text-amber-300">81% churn probability · Renewal in 23d</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">Predict risk early</h3>
                    <p className="text-sm text-zinc-400 leading-6">
                      Our ML model scores every account daily based on your weighted signals, surfacing churn risk weeks before it becomes visible.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* ── Step 03 — Act with playbooks ── */}
              <motion.div
                initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.24 }}
              >
                <div className="h-full rounded-[28px] border border-white/10 bg-white/[0.03] p-6 space-y-5 hover:border-white/16 hover:bg-white/[0.05] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-400/10 font-mono-numeric text-sm font-bold text-violet-300">
                      03
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-violet-400/20 to-transparent" />
                  </div>

                  {/* Illustration — playbook timeline */}
                  <div className="rounded-2xl border border-white/8 bg-black/25 p-4 space-y-2">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[9px] uppercase tracking-wider text-zinc-600">Save-play: At-Risk Account</p>
                      <span className="text-[9px] border border-emerald-400/25 bg-emerald-400/10 text-emerald-300 rounded px-1.5 py-0.5">Active</span>
                    </div>
                    {[
                      { task: 'Executive outreach email', owner: 'CSM', status: 'done', day: 'Day 1' },
                      { task: 'QBR scheduling call', owner: 'AE', status: 'done', day: 'Day 3' },
                      { task: 'Product walkthrough', owner: 'SE', status: 'active', day: 'Day 7' },
                      { task: 'Renewal proposal', owner: 'CSM', status: 'pending', day: 'Day 14' },
                    ].map((task, i) => (
                      <div key={task.task} className="flex items-start gap-2.5">
                        <div className="flex flex-col items-center mt-0.5">
                          <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${task.status === 'done' ? 'border-emerald-400/40 bg-emerald-400/20' :
                              task.status === 'active' ? 'border-violet-400/40 bg-violet-400/20' :
                                'border-white/15 bg-white/5'
                            }`}>
                            {task.status === 'done' && <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                            {task.status === 'active' && <div className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />}
                          </div>
                          {i < 3 && <div className="w-px h-4 bg-white/8 mt-1" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[10px] leading-4 ${task.status === 'pending' ? 'text-zinc-600' : 'text-zinc-300'}`}>{task.task}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-zinc-600">{task.day}</span>
                            <span className="text-[9px] text-zinc-700">·</span>
                            <span className="text-[9px] text-zinc-600">{task.owner}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">Act with playbooks</h3>
                    <p className="text-sm text-zinc-400 leading-6">
                      Turn risk signals into prescriptive actions — executive outreach, QBR scheduling, billing follow-ups — and track outcomes automatically.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </PageWrapper>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 3 — Features (bento grid, not identical cards)
      ══════════════════════════════════════════════════════════ */}
      <section className="relative border-t border-white/5 bg-black/40 backdrop-blur-[2px] py-28 overflow-hidden">
        <PageWrapper className="space-y-16">
          <motion.div className="space-y-4" {...scrollAnim}>
            <SectionLabel>Platform capabilities</SectionLabel>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <h2 className="text-4xl font-semibold tracking-tight text-white max-w-xl">
                One platform that replaces six CS tools
              </h2>
              <p className="max-w-sm text-zinc-400 lg:text-right">
                Stop stitching together spreadsheets, CRM plugins, and shared docs. ForesightCS is your unified intelligence layer.
              </p>
            </div>
          </motion.div>

          {/* Bento grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Featured card — spans 2 columns */}
            <motion.div
              className="md:col-span-2"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className={`h-full rounded-[24px] border border-emerald-400/25 bg-emerald-400/5 p-7 space-y-5 shadow-[0_0_40px_rgba(16,185,129,0.1)]`}>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10">
                    <BrainCircuit className="h-5 w-5 text-emerald-300" />
                  </div>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/8 px-3 py-1 text-xs font-medium text-emerald-300">
                    81% accuracy
                  </span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">Predictive churn scoring — 30 to 60 days out</h3>
                  <p className="text-zinc-400 leading-7">
                    Our ML model scores every account daily using signals from product usage, billing events, support intensity, and engagement frequency. No data science team needed.
                  </p>
                </div>
                {/* Mini live chart visualization */}
                <div className="flex items-end gap-1.5 pt-2 h-16">
                  {[35, 42, 38, 55, 48, 62, 58, 75, 70, 88].map((h, i) => (
                    <motion.div
                      key={i}
                      className="flex-1 rounded-sm"
                      style={{ alignSelf: 'flex-end', background: i >= 8 ? 'linear-gradient(to top,#10b981,#34d399)' : 'rgba(52,211,153,0.18)', borderRadius: '3px' }}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.04 }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Regular cards */}
            {features.slice(1).map((feature, i) => {
              const Icon = feature.icon;
              const cfg = colorMap[feature.color];
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: (i + 1) * 0.06 }}
                  whileHover={reduceMotion ? undefined : { y: -4, transition: { duration: 0.2 } }}
                >
                  <div className={`h-full rounded-[24px] border border-white/8 bg-white/[0.03] p-6 space-y-4 transition-colors hover:border-white/15 hover:bg-white/[0.05]`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${cfg.icon}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      {feature.stat && (
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium whitespace-nowrap ${cfg.stat}`}>
                          {feature.stat}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold text-white leading-snug">{feature.title}</h3>
                      <p className="text-sm text-zinc-400 leading-6">{feature.description}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </PageWrapper>
      </section>

{/* ═══════════════════════════════════════════════════════════
          SECTION 5 — Integrations (logo grid, visual heavy)
      ══════════════════════════════════════════════════════════ */}
      <section className="relative border-t border-white/5 bg-black/40 backdrop-blur-[2px] py-24 overflow-hidden">
        <PageWrapper className="space-y-12">
          <motion.div className="text-center space-y-4" {...scrollAnim}>
            <SectionLabel color="amber">Integrations</SectionLabel>
            <h2 className="text-3xl font-semibold tracking-tight text-white">
              Connects to every tool your team already uses
            </h2>
            <p className="mx-auto max-w-xl text-zinc-400">
              No rip-and-replace. ForesightCS sits on top of your existing stack — CRM, billing, support, and product analytics syncing in real-time.
            </p>
          </motion.div>

          {/* Horizontal Scrolling Marquee */}
          <div className="relative flex w-full overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,white_10%,white_90%,transparent)]">
            <motion.div
              className="flex shrink-0 items-center gap-4 px-2"
              animate={{ x: ['0%', '-50%'] }}
              transition={{ repeat: Infinity, ease: 'linear', duration: 40 }}
            >
              {[
                { name: 'Salesforce', cat: 'CRM', color: 'text-blue-300 border-blue-400/20 bg-blue-400/8' },
                { name: 'HubSpot', cat: 'CRM', color: 'text-orange-300 border-orange-400/20 bg-orange-400/8' },
                { name: 'Stripe', cat: 'Billing', color: 'text-violet-300 border-violet-400/20 bg-violet-400/8' },
                { name: 'Chargebee', cat: 'Billing', color: 'text-blue-300 border-blue-400/20 bg-blue-400/8' },
                { name: 'Zendesk', cat: 'Support', color: 'text-green-300 border-green-400/20 bg-green-400/8' },
                { name: 'Intercom', cat: 'Support', color: 'text-indigo-300 border-indigo-400/20 bg-indigo-400/8' },
                { name: 'Mixpanel', cat: 'Analytics', color: 'text-rose-300 border-rose-400/20 bg-rose-400/8' },
                { name: 'Segment', cat: 'Data', color: 'text-emerald-300 border-emerald-400/20 bg-emerald-400/8' },
                // Duplicate for infinite scroll effect
                { name: 'Salesforce', cat: 'CRM', color: 'text-blue-300 border-blue-400/20 bg-blue-400/8' },
                { name: 'HubSpot', cat: 'CRM', color: 'text-orange-300 border-orange-400/20 bg-orange-400/8' },
                { name: 'Stripe', cat: 'Billing', color: 'text-violet-300 border-violet-400/20 bg-violet-400/8' },
                { name: 'Chargebee', cat: 'Billing', color: 'text-blue-300 border-blue-400/20 bg-blue-400/8' },
                { name: 'Zendesk', cat: 'Support', color: 'text-green-300 border-green-400/20 bg-green-400/8' },
                { name: 'Intercom', cat: 'Support', color: 'text-indigo-300 border-indigo-400/20 bg-indigo-400/8' },
                { name: 'Mixpanel', cat: 'Analytics', color: 'text-rose-300 border-rose-400/20 bg-rose-400/8' },
                { name: 'Segment', cat: 'Data', color: 'text-emerald-300 border-emerald-400/20 bg-emerald-400/8' },
              ].map((item, i) => (
                <div
                  key={`${item.name}-${i}`}
                  className={`flex w-[200px] shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 ${item.color} bg-black/40 transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]`}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-current/20 bg-current/10 text-[10px] font-bold">
                    {item.name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="truncate text-[10px] opacity-60">{item.cat}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.p className="text-center text-sm text-zinc-600" {...scrollAnim}>
            + 40 more integrations via REST API and webhooks
          </motion.p>
        </PageWrapper>
      </section>
      
      {/* ═══════════════════════════════════════════════════════════
          SECTION 4 — Testimonials (horizontal scrolling ticker)
      ══════════════════════════════════════════════════════════ */}
      <section className="border-t border-white/5 py-28 overflow-hidden">
        <PageWrapper className="space-y-14">
          <motion.div className="text-center space-y-4" {...scrollAnim}>
            <SectionLabel color="violet">Customer results</SectionLabel>
            <h2 className="text-4xl font-semibold tracking-tight text-white">
              Real outcomes from real CS teams
            </h2>
            <p className="mx-auto max-w-xl text-zinc-400">
              From 2-person startups to 50-person CS orgs — here&apos;s what teams say after switching to a signal-first approach.
            </p>
          </motion.div>

          {/* Three columns with stagger — NOT identical cards */}
          <div className="grid gap-6 md:grid-cols-3">
            {landingTestimonials.slice(0, 3).map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={i === 1 ? 'md:mt-8' : ''}
              >
                <div className={`h-full rounded-[24px] border p-6 space-y-5 ${i === 1 ? 'border-violet-400/20 bg-violet-400/5' : 'border-white/8 bg-white/[0.03]'}`}>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, s) => (
                      <span key={s} className="text-amber-400">★</span>
                    ))}
                  </div>
                  <p className="text-sm leading-7 text-zinc-300 italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 1 ? 'bg-gradient-to-br from-violet-500 to-emerald-500' : 'bg-gradient-to-br from-emerald-400/40 to-violet-400/40 border border-white/10'}`}>
                      {t.name.split(' ').map((w: string) => w[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{t.name}</p>
                      <p className="text-xs text-zinc-500">{t.title} · {t.company}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Second row — 2 offset cards + stat block */}
          <div className="grid gap-6 md:grid-cols-[1fr_1fr_300px]">
            {landingTestimonials.slice(3, 5).map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <div className="h-full rounded-[24px] border border-white/8 bg-white/[0.03] p-6 space-y-4">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, s) => <span key={s} className="text-amber-400 text-sm">★</span>)}
                  </div>
                  <p className="text-sm leading-7 text-zinc-300 italic">&ldquo;{t.quote}&rdquo;</p>
                  <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                    <div className="h-9 w-9 rounded-full border border-white/10 bg-gradient-to-br from-emerald-400/30 to-violet-400/30 flex items-center justify-center text-xs font-bold text-white">
                      {t.name.split(' ').map((w: string) => w[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{t.name}</p>
                      <p className="text-xs text-zinc-500">{t.title} · {t.company}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            {/* Stat block */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="h-full rounded-[24px] border border-emerald-400/20 bg-gradient-to-br from-emerald-400/8 to-violet-400/5 p-6 flex flex-col justify-center space-y-5">
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Trusted by</p>
                <div className="space-y-4">
                  {[['400+', 'CS teams worldwide'], ['98%', 'signal data coverage'], ['$2.1B', 'ARR protected']].map(([val, lbl]) => (
                    <div key={lbl}>
                      <p className="font-mono-numeric text-3xl font-bold text-white">{val}</p>
                      <p className="text-sm text-zinc-400">{lbl}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </PageWrapper>
      </section>

      
    </div>
  );
}
