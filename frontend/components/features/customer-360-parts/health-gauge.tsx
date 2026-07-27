'use client';

import { motion } from 'framer-motion';

import { Badge } from '@/components/ui/badge';

/** Radial health gauge — SVG ring that fills based on health score. */
export function HealthGauge({ score, health }: { score: number; health: string }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * (score / 100);
  const color =
    health === 'Healthy'
      ? '#34d399'
      : health === 'At-Risk'
        ? '#f59e0b'
        : '#fb7185';

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - filled }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
          />
        </svg>
        <div className="text-center">
          <p className="font-mono-numeric text-2xl font-semibold text-white">{score}</p>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">score</p>
        </div>
      </div>
      <Badge
        variant={
          health === 'Healthy' ? 'success' : health === 'At-Risk' ? 'warning' : 'danger'
        }
      >
        {health}
      </Badge>
    </div>
  );
}
