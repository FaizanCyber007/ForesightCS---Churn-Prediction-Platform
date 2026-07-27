'use client';

import { Mail, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { GlassCard } from '@/components/ui/glass-card';
import { useToast } from '@/components/ui/toast';
import { ContactFormModal } from '@/components/features/contact-form-modal';
import type { CustomerContact } from '@/services/api';

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function CustomerContacts({
  customerId,
  contacts,
}: {
  customerId: string;
  contacts: CustomerContact[];
}) {
  const { toast } = useToast();
  const router = useRouter();

  async function handleDelete(contact: CustomerContact) {
    try {
      const { deleteContactAction } = await import('@/app/actions');
      await deleteContactAction(customerId, contact.id);
      toast({ title: 'Contact removed', description: contact.name, tone: 'success' });
      router.refresh();
    } catch {
      toast({ title: 'Error', description: 'Failed to remove the contact.', tone: 'error' });
    }
  }

  return (
    <GlassCard className="h-fit space-y-4">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Key Contacts
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">
          Customer stakeholders
        </h2>
      </div>
      <div className="space-y-3">
        {contacts.length === 0 ? (
          <p className="text-sm text-zinc-500">No contacts on file for this customer yet.</p>
        ) : null}
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="group relative flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 p-3 transition-colors hover:border-white/12 hover:bg-white/4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-zinc-300">
                {initialsFor(contact.name)}
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-white">{contact.name}</p>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                  {contact.role || 'Contact'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <a
                href={`mailto:${contact.email}`}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                title="Send email"
              >
                <Mail className="h-4 w-4" />
              </a>
              <ContactFormModal customerId={customerId} contact={contact} />
              <button
                type="button"
                onClick={() => handleDelete(contact)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 transition-colors"
                title="Remove contact"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <ContactFormModal customerId={customerId} />
    </GlassCard>
  );
}
