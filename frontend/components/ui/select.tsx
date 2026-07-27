import * as React from 'react';

import { cn } from '@/lib/cn';

export type SelectOption = {
  value: string;
  label: string;
};

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
}

const baseSelectClassName =
  'flex h-11 w-full appearance-none rounded-2xl border border-white/10 bg-white/5 px-4 pr-10 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl transition-colors outline-none focus-visible:border-emerald-400/50 focus-visible:ring-2 focus-visible:ring-emerald-400/30 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * A styled, consistent <select>. Two usage modes:
 *  - `options` array (preferred): renders options declaratively
 *  - children: pass <option> elements directly (escape hatch)
 *
 * The dropdown list still uses native rendering, so options keep dark
 * backgrounds via the global `option { background: #0a0a0a }` rule.
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(baseSelectClassName, className)}
          {...props}
        >
          {options
            ? options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            : children}
        </select>
        <ChevronIndicator />
      </div>
    );
  }
);

Select.displayName = 'Select';

function ChevronIndicator() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export { Select };
