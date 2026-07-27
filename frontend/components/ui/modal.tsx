'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/cn';

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: ModalProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const previousActiveElementRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (open) {
      // Store the current active element to restore focus when the modal closes
      previousActiveElementRef.current = document.activeElement as HTMLElement;
      
      // Focus the modal container
      containerRef.current?.focus();
    } else {
      // Restore focus
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    }
  }, [open]);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onOpenChange(false);
        return;
      }

      if (event.key === 'Tab' && containerRef.current) {
        // Find all focusable elements inside the modal
        const focusableSelector =
          'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]';
        const focusableElements = Array.from(
          containerRef.current.querySelectorAll<HTMLElement>(focusableSelector)
        );

        if (focusableElements.length === 0) {
          event.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          // Shift + Tab: trap focus at the beginning
          if (document.activeElement === firstElement || document.activeElement === containerRef.current) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: trap focus at the end
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    }

    if (open) {
      window.addEventListener('keydown', onKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.button
            type="button"
            aria-label="Close modal overlay"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            ref={containerRef}
            tabIndex={-1}
            className={cn(
              'relative z-10 w-full max-w-2xl rounded-[32px] border border-white/10 bg-[#0d0f12]/95 p-6 text-white shadow-[0_40px_120px_rgba(0,0,0,0.6)] backdrop-blur-2xl focus:outline-none',
              className
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            aria-describedby={description ? 'modal-description' : undefined}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {(title || description) && (
              <header className="mb-5 space-y-2">
                {title ? (
                  <h2
                    id="modal-title"
                    className="text-xl font-semibold tracking-tight"
                  >
                    {title}
                  </h2>
                ) : null}
                {description ? (
                  <p
                    id="modal-description"
                    className="max-w-xl text-sm text-zinc-400"
                  >
                    {description}
                  </p>
                ) : null}
              </header>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
