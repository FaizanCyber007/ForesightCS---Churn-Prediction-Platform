'use client';

import * as React from 'react';

import { cn } from '@/lib/cn';

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
  baseId: string;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext(component: string) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) {
    throw new Error(`<${component}> must be used within <Tabs>`);
  }
  return ctx;
}

export interface TabsProps {
  value?: string;
  defaultValue: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({
  value: controlledValue,
  defaultValue,
  onValueChange,
  children,
  className,
}: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;
  const baseId = React.useId();

  const setValue = React.useCallback(
    (next: string) => {
      if (!isControlled) setUncontrolledValue(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange]
  );

  const ctx = React.useMemo(
    () => ({ value, setValue, baseId }),
    [value, setValue, baseId]
  );

  return (
    <TabsContext.Provider value={ctx}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-xl',
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = useTabsContext('TabsTrigger');
  const isActive = ctx.value === value;

  return (
    <button
      type="button"
      role="tab"
      id={`${ctx.baseId}-trigger-${value}`}
      aria-selected={isActive}
      aria-controls={`${ctx.baseId}-content-${value}`}
      tabIndex={isActive ? 0 : -1}
      onClick={() => ctx.setValue(value)}
      onKeyDown={(event) => {
        // Roving tabindex arrow-key navigation for the tab list.
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          const list = event.currentTarget.closest('[role="tablist"]');
          if (!list) return;
          const triggers = Array.from(
            list.querySelectorAll<HTMLButtonElement>('[role="tab"]')
          );
          const index = triggers.indexOf(event.currentTarget);
          const dir = event.key === 'ArrowRight' ? 1 : -1;
          const next = triggers[(index + dir + triggers.length) % triggers.length];
          next.focus();
          next.click();
        }
      }}
      className={cn(
        'relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60',
        isActive
          ? 'bg-white text-black shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_12px_30px_rgba(16,185,129,0.18)]'
          : 'text-zinc-400 hover:text-white',
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = useTabsContext('TabsContent');
  if (ctx.value !== value) return null;

  return (
    <div
      role="tabpanel"
      id={`${ctx.baseId}-content-${value}`}
      aria-labelledby={`${ctx.baseId}-trigger-${value}`}
      tabIndex={0}
      className={cn('focus-visible:outline-none', className)}
    >
      {children}
    </div>
  );
}
