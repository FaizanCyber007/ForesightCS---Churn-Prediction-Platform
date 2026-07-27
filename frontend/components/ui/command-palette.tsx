'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CornerDownLeft, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/cn';

export interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  group: string;
  href: string;
}

interface CommandPaletteProps {
  items: CommandItem[];
  /** Controlled open state — if provided, the palette works as a controlled component */
  open?: boolean;
  /** Called when the palette wants to close (Esc, backdrop click, navigation) */
  onClose?: () => void;
}

/**
 * A keyboard-first command palette for fast navigation and customer lookup.
 * Supports both controlled (open/onClose props) and uncontrolled (own keyboard
 * shortcut) modes. Provides fuzzy substring filtering and full roving-keyboard
 * control with ARIA dialog semantics.
 */
export function CommandPalette({ items, open: controlledOpen, onClose }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);

  // When controlled externally, use that value; otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const close = React.useCallback(() => {
    if (onClose) onClose();
    else setInternalOpen(false);
  }, [onClose]);

  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const isToggle =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (isToggle) {
        event.preventDefault();
        if (controlledOpen !== undefined) {
          // Controlled mode — just call onClose to toggle
          if (open) close();
          else onClose?.();
        } else {
          setInternalOpen((current) => {
            if (!current) {
              setQuery('');
              setActiveIndex(0);
            }
            return !current;
          });
        }
      } else if (event.key === 'Escape' && open) {
        close();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close, controlledOpen, onClose]);

  // Reset query & index when palette opens
  React.useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  // Focus the input when the palette opens
  React.useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [open]);

  const filtered = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) =>
      `${item.label} ${item.hint ?? ''} ${item.group}`
        .toLowerCase()
        .includes(normalized)
    );
  }, [items, query]);

  // Derive a safe active index during render rather than syncing via an effect.
  const safeActiveIndex = Math.min(
    activeIndex,
    Math.max(filtered.length - 1, 0)
  );

  function commit(item: CommandItem) {
    close();
    router.push(item.href);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % Math.max(filtered.length, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = filtered[safeActiveIndex];
      if (item) commit(item);
    }
  }

  // Group results while preserving overall index for keyboard roving.
  const grouped = React.useMemo(() => {
    const map = new Map<string, { item: CommandItem; index: number }[]>();
    filtered.forEach((item, index) => {
      const bucket = map.get(item.group) ?? [];
      bucket.push({ item, index });
      map.set(item.group, bucket);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]">
          <motion.button
            type="button"
            aria-label="Close command palette"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-xl overflow-hidden rounded-[28px] border border-white/10 bg-[#0d0f12]/95 shadow-[0_40px_120px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-5">
              <Search className="h-4 w-4 text-zinc-500" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Search customers or jump to…"
                className="h-14 w-full bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
                aria-autocomplete="list"
                aria-controls="command-palette-list"
              />
              <kbd className="hidden rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-500 sm:block">
                Esc
              </kbd>
            </div>
            <div id="command-palette-list" className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
              {filtered.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-zinc-500">
                  No matches for &ldquo;{query}&rdquo;.
                </p>
              ) : (
                grouped.map(([group, entries]) => (
                  <div key={group} className="mb-2">
                    <p className="px-3 py-2 text-xs uppercase tracking-[0.3em] text-zinc-500">
                      {group}
                    </p>
                    {entries.map(({ item, index }) => (
                      <button
                        key={item.id}
                        type="button"
                        role="option"
                        aria-selected={safeActiveIndex === index}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => commit(item)}
                        className={cn(
                          'flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50',
                          safeActiveIndex === index
                            ? 'bg-white/8 text-white'
                            : 'text-zinc-300 hover:bg-white/5'
                        )}
                      >
                        <span className="flex flex-col">
                          <span className="font-medium">{item.label}</span>
                          {item.hint ? (
                            <span className="text-xs text-zinc-500">
                              {item.hint}
                            </span>
                          ) : null}
                        </span>
                        {safeActiveIndex === index ? (
                          <CornerDownLeft className="h-4 w-4 text-zinc-500" />
                        ) : null}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
