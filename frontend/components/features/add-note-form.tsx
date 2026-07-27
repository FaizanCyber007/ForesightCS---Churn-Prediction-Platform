'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { addCustomerNoteAction } from '@/app/actions';

export function AddNoteForm({ customerId }: { customerId: string }) {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addCustomerNoteAction(customerId, note);
      setNote('');
      toast({
        title: 'Note added',
        description: 'Your note was successfully added to the timeline.',
        tone: 'success'
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to add the note. Please try again.',
        tone: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative mt-4">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Type a new update, meeting summary, or customer note..."
        disabled={isSubmitting}
        rows={2}
        className="w-full resize-none rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-zinc-200 placeholder-zinc-600 transition-colors focus:border-white/20 focus:bg-white/[0.05] focus:outline-none disabled:opacity-50"
      />
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={!note.trim() || isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Add note'}
          <Send className="h-3 w-3" />
        </button>
      </div>
    </form>
  );
}
