'use client';

import { Mail, MapPin, MessageSquare, Phone } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { submitContactFormAction } from '@/app/actions';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';

const contactInfo = [
  {
    icon: Mail,
    label: 'Email us',
    value: 'hello@foresightcs.com',
    color: 'text-emerald-300',
    bg: 'bg-emerald-400/10',
    href: 'mailto:hello@foresightcs.com',
  },
  {
    icon: Phone,
    label: 'Call us',
    value: '+1 (555) 123-4567',
    color: 'text-violet-300',
    bg: 'bg-violet-400/10',
    href: 'tel:+15551234567',
  },
  {
    icon: MapPin,
    label: 'Headquarters',
    value: '100 SaaS Blvd, San Francisco, CA',
    color: 'text-blue-300',
    bg: 'bg-blue-400/10',
    href: null,
  },
];

const contactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  message: z.string().min(10, 'Message must be at least 10 characters long'),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const { toast } = useToast();
  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      message: '',
    }
  });
  const [submitting, setSubmitting] = useState(false);
  const reduceMotion = useReducedMotion();

  async function onSubmit(data: ContactFormData) {
    setSubmitting(true);
    try {
      const result = await submitContactFormAction(data);
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          tone: 'error',
        });
      } else {
        toast({
          title: 'Message sent',
          description: 'Our team will reply within one business day.',
          tone: 'success',
        });
        form.reset();
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        tone: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="relative overflow-hidden py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.1),transparent_38%),radial-gradient(circle_at_bottom,rgba(139,92,246,0.1),transparent_40%)]" />
      <PageWrapper className="relative">
        <div className="mx-auto max-w-6xl grid gap-16 lg:grid-cols-[1fr_1.2fr] lg:items-start">
          {/* Left column */}
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.4em] text-emerald-300">Contact</p>
              <h1 className="text-5xl font-semibold tracking-tight text-white">
                Get in touch
              </h1>
              <p className="text-lg text-zinc-400 max-w-md">
                Have questions about ForesightCS? Our team is ready to help you build a more predictive customer success operation.
              </p>
            </div>

            <div className="space-y-4">
              {contactInfo.map((item) => {
                const Icon = item.icon;
                const content = (
                  <GlassCard hoverable className="flex items-center gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.bg} ${item.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <p className="text-sm text-zinc-400">{item.value}</p>
                    </div>
                  </GlassCard>
                );
                return item.href ? (
                  <a key={item.label} href={item.href} className="block">
                    {content}
                  </a>
                ) : (
                  <div key={item.label}>{content}</div>
                );
              })}
            </div>

            <GlassCard className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-300">
                <MessageSquare className="h-4 w-4" />
                <p className="text-sm uppercase tracking-[0.3em]">Live chat</p>
              </div>
              <p className="text-zinc-400 text-sm">
                Available Monday–Friday, 9am–6pm PST. Average response time: 3 minutes.
              </p>
              <Button variant="secondary" className="w-full">
                Start chat session
              </Button>
            </GlassCard>
          </div>

          {/* Right column — contact form */}
          <motion.div
            initial={{ opacity: 0, x: reduceMotion ? 0 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <GlassCard className="space-y-6 p-8">
              <div>
                <h2 className="text-2xl font-semibold text-white">Send a message</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Fill in your details and we&#39;ll get back to you within 24 hours.
                </p>
              </div>
              <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm text-zinc-300">First name</span>
                    <Input 
                      placeholder="Jane" 
                      {...form.register('firstName')} 
                      className={form.formState.errors.firstName ? 'border-rose-500/50 focus-visible:ring-rose-500/20' : ''}
                    />
                    {form.formState.errors.firstName && (
                      <p className="text-xs text-rose-400">{form.formState.errors.firstName.message}</p>
                    )}
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-zinc-300">Last name</span>
                    <Input 
                      placeholder="Doe" 
                      {...form.register('lastName')} 
                      className={form.formState.errors.lastName ? 'border-rose-500/50 focus-visible:ring-rose-500/20' : ''}
                    />
                    {form.formState.errors.lastName && (
                      <p className="text-xs text-rose-400">{form.formState.errors.lastName.message}</p>
                    )}
                  </label>
                </div>
                <label className="block space-y-2">
                  <span className="text-sm text-zinc-300">Work email</span>
                  <Input
                    type="email"
                    placeholder="jane@company.com"
                    {...form.register('email')}
                    className={form.formState.errors.email ? 'border-rose-500/50 focus-visible:ring-rose-500/20' : ''}
                  />
                  {form.formState.errors.email && (
                    <p className="text-xs text-rose-400">{form.formState.errors.email.message}</p>
                  )}
                </label>
                <label className="block space-y-2">
                  <span className="text-sm text-zinc-300">Message</span>
                  <Textarea
                    placeholder="How can we help you?"
                    className={`min-h-[120px] ${form.formState.errors.message ? 'border-rose-500/50 focus-visible:ring-rose-500/20' : ''}`}
                    {...form.register('message')}
                  />
                  {form.formState.errors.message && (
                    <p className="text-xs text-rose-400">{form.formState.errors.message.message}</p>
                  )}
                </label>
                <Button className="w-full" size="lg" type="submit" disabled={submitting}>
                  {submitting ? 'Sending…' : 'Send Message'}
                </Button>
              </form>
            </GlassCard>
          </motion.div>
        </div>
      </PageWrapper>
    </section>
  );
}