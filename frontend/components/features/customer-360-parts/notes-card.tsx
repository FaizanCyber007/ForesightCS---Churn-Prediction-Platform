'use client';

import { GlassCard } from '@/components/ui/glass-card';
import { AddNoteForm } from '@/components/features/add-note-form';

export function NotesCard({ customerId, notes }: { customerId: string; notes: string[] }) {
  return (
    <GlassCard className="h-fit space-y-4">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Customer notes
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">
          Context summary
        </h2>
      </div>
      <div className="space-y-3 text-sm text-zinc-300">
        {notes.map((note, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/8 bg-black/20 p-4"
          >
            {note}
          </div>
        ))}
      </div>
      <AddNoteForm customerId={customerId} />
    </GlassCard>
  );
}
