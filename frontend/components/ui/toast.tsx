'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, XCircle } from 'lucide-react';

import { cn } from '@/lib/cn';

type ToastTone = 'success' | 'info' | 'error';

export interface Toast {
  id: number;
  title: string;
  description?: string;
  tone?: ToastTone;
}

interface ToastContextValue {
  toast: (input: Omit<Toast, 'id'>) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, { ring: string; icon: React.ReactNode }> = {
  success: {
    ring: 'border-emerald-400/30',
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-300" />,
  },
  info: {
    ring: 'border-violet-400/30',
    icon: <Info className="h-4 w-4 text-violet-300" />,
  },
  error: {
    ring: 'border-rose-400/30',
    icon: <XCircle className="h-4 w-4 text-rose-300" />,
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const idRef = React.useRef(0);

  const remove = React.useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = React.useCallback(
    (input: Omit<Toast, 'id'>) => {
      const id = ++idRef.current;
      setToasts((current) => [...current, { ...input, id }]);
      window.setTimeout(() => remove(id), 4200);
    },
    [remove]
  );

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed bottom-6 right-6 z-[60] flex w-full max-w-sm flex-col gap-3"
      >
        <AnimatePresence initial={false}>
          {toasts.map((entry) => {
            const tone = entry.tone ?? 'success';
            const style = toneStyles[tone];
            return (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, transition: { duration: 0.2 } }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                role="status"
                className={cn(
                  'pointer-events-auto flex items-start gap-3 rounded-2xl border bg-[#0d0f12]/95 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl',
                  style.ring
                )}
              >
                <div className="mt-0.5">{style.icon}</div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">
                    {entry.title}
                  </p>
                  {entry.description ? (
                    <p className="text-sm text-zinc-400">{entry.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  aria-label="Dismiss notification"
                  onClick={() => remove(entry.id)}
                  className="ml-auto text-zinc-500 transition-colors hover:text-white"
                >
                  ✕
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within <ToastProvider>');
  }
  return ctx;
}
