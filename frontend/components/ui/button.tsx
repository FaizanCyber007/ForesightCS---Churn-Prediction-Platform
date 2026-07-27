import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Solid dark with white text — the "default" action button
        primary:
          'bg-white text-black shadow-[0_2px_16px_rgba(255,255,255,0.12)] hover:-translate-y-0.5 hover:bg-zinc-100 active:translate-y-0',
        // Ghost with border
        secondary:
          'border border-white/15 bg-transparent text-white hover:border-white/30 hover:bg-white/8 active:bg-white/5',
        // Subtle text-only
        ghost: 'text-zinc-300 hover:bg-white/6 hover:text-white',
        // Bordered outline
        outline:
          'border border-white/15 bg-transparent text-white hover:border-white/30 hover:bg-white/5',
        // Destructive
        danger: 'bg-rose-500 text-white hover:bg-rose-400 shadow-[0_4px_16px_rgba(239,68,68,0.2)]',
        // Emerald-to-violet gradient — the PRIMARY brand CTA (most used)
        brand:
          'bg-gradient-to-r from-emerald-500 to-violet-600 text-white shadow-[0_4px_24px_rgba(16,185,129,0.25)] hover:from-emerald-400 hover:to-violet-500 hover:shadow-[0_6px_32px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 active:translate-y-0',
        // Alias kept for backward compat — same as brand
        theme:
          'bg-gradient-to-r from-emerald-500 to-violet-600 text-white shadow-[0_4px_24px_rgba(16,185,129,0.25)] hover:from-emerald-400 hover:to-violet-500 hover:shadow-[0_6px_32px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 active:translate-y-0',
        // Subtle emerald tint
        subtle:
          'border border-emerald-400/20 bg-emerald-400/8 text-emerald-300 hover:border-emerald-400/35 hover:bg-emerald-400/14 hover:text-emerald-200',
      },
      size: {
        xs: 'h-7 px-3 text-xs',
        sm: 'h-9 px-4',
        md: 'h-11 px-5',
        lg: 'h-12 px-7 text-base',
        xl: 'h-14 px-8 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'brand',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, type = 'button', asChild, children, ...props },
    ref
  ) => {
    const sharedClassName = cn(buttonVariants({ variant, size }), className);

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(
        children as React.ReactElement<{ className?: string }>,
        {
          className: cn(
            sharedClassName,
            (children.props as { className?: string }).className
          ),
        }
      );
    }

    return (
      <button ref={ref} type={type} className={sharedClassName} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
