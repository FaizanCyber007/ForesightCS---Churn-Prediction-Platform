'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Bell,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Zap,
} from 'lucide-react';

// Simulated live data that cycles through states — like a product walkthrough video
const accountScenarios = [
  {
    id: 1,
    company: 'Meridian SaaS',
    health: 'critical' as const,
    score: 18,
    churn: 81,
    mrr: '$24,400',
    owner: 'A. Chen',
    signal: 'API usage dropped 74% — executive sponsor left',
    renewal: '23 days',
  },
  {
    id: 2,
    company: 'BrightCore Inc.',
    health: 'risk' as const,
    score: 47,
    churn: 43,
    mrr: '$11,200',
    owner: 'J. Rivera',
    signal: 'Login frequency down 31% week-over-week',
    renewal: '61 days',
  },
  {
    id: 3,
    company: 'Summit Ops',
    health: 'healthy' as const,
    score: 94,
    churn: 5,
    mrr: '$30,200',
    owner: 'P. Shah',
    signal: 'Usage at 97% capacity — strong expansion signal',
    renewal: '189 days',
  },
];

const metricsFlow = [
  { label: 'ARR Protected', value: '$1.84M', delta: '+12%', up: true },
  { label: 'At-Risk Accounts', value: '14', delta: '-3 this week', up: true },
  { label: 'Avg Health Score', value: '74', delta: '+4pts', up: true },
  { label: 'Expansion Pipeline', value: '$420K', delta: '+9%', up: true },
];

const healthConfig = {
  critical: { bar: 'bg-rose-500', dot: 'bg-rose-400', text: 'text-rose-400', badge: 'text-rose-300 border-rose-500/30 bg-rose-500/15', label: 'Critical' },
  risk: { bar: 'bg-amber-400', dot: 'bg-amber-400', text: 'text-amber-400', badge: 'text-amber-300 border-amber-500/30 bg-amber-500/15', label: 'At-Risk' },
  healthy: { bar: 'bg-emerald-400', dot: 'bg-emerald-400', text: 'text-emerald-400', badge: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/15', label: 'Healthy' },
};



function LiveAccountCard({ account, active }: { account: typeof accountScenarios[0]; active: boolean }) {
  const cfg = healthConfig[account.health];
  return (
    <motion.div
      layout
      className={`rounded-xl border p-3 transition-all duration-300 ${active
        ? 'border-white/15 bg-white/6 shadow-[0_0_20px_rgba(255,255,255,0.04)]'
        : 'border-white/5 bg-white/2'
        }`}
    >
      <div className="flex items-center gap-2.5">
        <div className={`h-2 w-2 rounded-full ${cfg.dot} shrink-0 ${active && account.health === 'critical' ? 'animate-pulse' : ''}`} />
        <p className="flex-1 text-sm font-medium text-white truncate">{account.company}</p>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {active && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Health score</span>
                <span className={`font-mono-numeric font-bold ${cfg.text}`}>{account.score}/100</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                <motion.div
                  className={`h-full rounded-full ${cfg.bar}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${account.score}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-black/20 px-2.5 py-1.5">
                <AlertTriangle className="h-3 w-3 shrink-0 text-amber-400" />
                <p className="text-[10px] text-zinc-400 leading-tight">{account.signal}</p>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                <div className="rounded-lg bg-white/4 px-1.5 py-1.5">
                  <p className="text-zinc-500">MRR</p>
                  <p className="font-mono-numeric font-semibold text-white">{account.mrr}</p>
                </div>
                <div className="rounded-lg bg-white/4 px-1.5 py-1.5">
                  <p className="text-zinc-500">Churn %</p>
                  <p className={`font-mono-numeric font-semibold ${cfg.text}`}>{account.churn}%</p>
                </div>
                <div className="rounded-lg bg-white/4 px-1.5 py-1.5">
                  <p className="text-zinc-500">Renewal</p>
                  <p className="font-semibold text-white">{account.renewal}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function DashboardMockup() {
  const [activeAccountIdx, setActiveAccountIdx] = useState(0);
  const [tick, setTick] = useState(0);
  const reduceMotion = useReducedMotion();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (reduceMotion) return;
    intervalRef.current = setInterval(() => {
      setActiveAccountIdx((i) => (i + 1) % accountScenarios.length);
      setTick((t) => t + 1);
    }, 3200);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [reduceMotion]);



  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d10] shadow-[0_40px_120px_rgba(0,0,0,0.8)]">
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-white/8 bg-white/3 px-4 py-3">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-rose-500/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
        </div>
        <div className="mx-auto flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-3 py-1 text-[10px] text-zinc-500">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          app.foresightcs.com/dashboard
        </div>
      </div>

      {/* Dashboard content */}
      <div className="grid grid-cols-[160px_1fr] lg:grid-cols-[180px_1fr]">
        {/* Mini sidebar */}
        <div className="border-r border-white/8 bg-black/30 p-3 space-y-1">
          <div className="flex items-center gap-2 px-2 py-1.5 mb-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-[10px] font-bold text-emerald-300">F</div>
            <span className="text-[10px] font-semibold tracking-wider text-white">ForesightCS</span>
          </div>
          {[
            { label: 'Command Center', icon: BarChart3, active: true },
            { label: 'Accounts', icon: Users, active: false },
            { label: 'Playbooks', icon: Zap, active: false },
            { label: 'Analytics', icon: Activity, active: false },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] ${item.active ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20' : 'text-zinc-500'}`}>
                <Icon className="h-3 w-3 shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
            );
          })}
        </div>

        {/* Main area */}
        <div className="p-3 space-y-3">
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {metricsFlow.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.4 }}
                className="rounded-xl border border-white/8 bg-white/3 p-2.5 space-y-1"
              >
                <p className="text-[9px] uppercase tracking-wider text-zinc-500">{m.label}</p>
                <p className="font-mono-numeric text-sm font-bold text-white">{m.value}</p>
                <div className="flex items-center gap-1">
                  {m.up ? <TrendingUp className="h-2.5 w-2.5 text-emerald-400" /> : <TrendingDown className="h-2.5 w-2.5 text-rose-400" />}
                  <span className={`text-[9px] ${m.up ? 'text-emerald-400' : 'text-rose-400'}`}>{m.delta}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Split: chart + accounts */}
          <div className="grid grid-cols-[1fr_140px] gap-2 lg:grid-cols-[1fr_160px]">
            {/* Animated bar chart */}
            <div className="rounded-xl border border-white/8 bg-white/3 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[9px] uppercase tracking-wider text-zinc-500">Retained ARR trend</p>
                <div className="flex items-center gap-1 text-[9px] text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </div>
              </div>
              <div className="flex items-end gap-1 h-16">
                {[55, 62, 58, 71, 79, 88, 92, 95].map((h, i) => (
                  <motion.div
                    key={`${tick}-${i}`}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 0.5, delay: i * 0.04, ease: 'easeOut' }}
                    style={{
                      alignSelf: 'flex-end',
                      flex: 1,
                      borderRadius: '3px',
                      background: i === 7
                        ? 'linear-gradient(to top, #10b981, #34d399)'
                        : 'rgba(52,211,153,0.18)',
                    }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[8px] text-zinc-600">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'].map(m => <span key={m}>{m}</span>)}
              </div>
            </div>

            {/* Health donut */}
            <div className="rounded-xl border border-white/8 bg-white/3 p-3 flex flex-col items-center justify-center gap-2">
              <p className="text-[9px] uppercase tracking-wider text-zinc-500 text-center">Portfolio health</p>
              <svg viewBox="0 0 64 64" className="h-14 w-14">
                <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <circle cx="32" cy="32" r="26" fill="none" stroke="#34d399" strokeWidth="8" strokeDasharray="97.4 65.9" strokeLinecap="round" transform="rotate(-90 32 32)" />
                <circle cx="32" cy="32" r="26" fill="none" stroke="#f59e0b" strokeWidth="8" strokeDasharray="41.3 122" strokeDashoffset="-97.4" strokeLinecap="round" transform="rotate(-90 32 32)" />
                <circle cx="32" cy="32" r="26" fill="none" stroke="#fb7185" strokeWidth="8" strokeDasharray="24.5 139" strokeDashoffset="-138.7" strokeLinecap="round" transform="rotate(-90 32 32)" />
                <text x="32" y="35" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">60%</text>
              </svg>
              <div className="space-y-0.5 w-full">
                {[['Healthy', '#34d399'], ['At-Risk', '#f59e0b'], ['Critical', '#fb7185']].map(([l, c]) => (
                  <div key={l} className="flex items-center gap-1.5 text-[8px] text-zinc-400">
                    <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: c }} />
                    {l}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Account list with live focus */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[9px] uppercase tracking-wider text-zinc-500">Priority accounts</p>
              <div className="flex items-center gap-1 text-[9px] text-zinc-600">
                <Bell className="h-2.5 w-2.5" /> 3 alerts
              </div>
            </div>
            {accountScenarios.map((account, i) => (
              <LiveAccountCard key={account.id} account={account} active={i === activeAccountIdx} />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="flex items-center justify-between border-t border-white/5 bg-black/20 px-4 py-2 text-[9px] text-zinc-600">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Signal fusion active · 8 integrations connected
        </div>
        <div className="flex items-center gap-3">
          <span>ML model v4.2</span>
          <span>Last sync: 2 min ago</span>
        </div>
      </div>
    </div>
  );
}
