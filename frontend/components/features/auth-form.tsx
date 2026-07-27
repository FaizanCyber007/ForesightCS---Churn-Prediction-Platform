'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LockKeyhole,
  Mail,
  UserRound,
  Building2,
  BriefcaseBusiness,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/apiClient';
import {
  loginSchema,
  registerSchema,
  type LoginFormValues,
  type RegisterFormValues,
} from '@/lib/schemas';

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    setSubmitting(true);
    try {
      await login(values.identifier, values.password);
      toast({
        title: 'Authorized',
        description: 'Access granted. Opening CS command center.',
        tone: 'success',
      });
      router.push('/dashboard');
    } catch (error) {
      toast({
        title: 'Authentication Failed',
        description:
          error instanceof ApiError ? error.message : 'Check credentials and try again.',
        tone: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-xl"
    >
      <GlassCard className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">
            Welcome back
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white">
            Sign in to your command center
          </h1>
          <p className="mt-2 text-zinc-400">
            Open live churn intelligence, review risk customers, and launch save
            plays in one place.
          </p>
        </div>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <Field
            label="Email or username"
            icon={<UserRound className="h-4 w-4" />}
            error={form.formState.errors.identifier?.message}
          >
            <Input
              type="text"
              placeholder="you@company.com or username"
              disabled={submitting}
              {...form.register('identifier')}
            />
          </Field>
          <Field
            label="Password"
            icon={<LockKeyhole className="h-4 w-4" />}
            error={form.formState.errors.password?.message}
          >
            <Input
              type="password"
              placeholder="Enter your secure workspace password"
              disabled={submitting}
              {...form.register('password')}
            />
          </Field>
          <Button className="w-full" type="submit" disabled={submitting}>
            {submitting ? 'Connecting...' : 'Enter the command center'}
          </Button>
        </form>
        <p className="text-sm text-zinc-400">
          New here?{' '}
          <Link className="text-emerald-300 hover:text-emerald-200 transition-colors" href="/register">
            Create a workspace
          </Link>
        </p>
      </GlassCard>
    </motion.div>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      companyName: '',
      role: 'Customer Success Manager',
      email: '',
      username: '',
      password: '',
    },
  });

  async function onSubmit(values: RegisterFormValues) {
    setSubmitting(true);
    try {
      await register(
        values.fullName,
        values.companyName,
        values.role,
        values.email,
        values.username,
        values.password
      );
      toast({
        title: 'Workspace Created',
        description: `Welcome to ForesightCS, ${values.fullName}.`,
        tone: 'success',
      });
      router.push('/dashboard');
    } catch (error) {
      if (error instanceof ApiError) {
        // Backend field names (snake_case) -> form field names, so a
        // duplicate-company/username/email 400 highlights the exact
        // input instead of just a generic toast.
        const fieldMap: Partial<Record<string, keyof RegisterFormValues>> = {
          full_name: 'fullName',
          company_name: 'companyName',
          email: 'email',
          username: 'username',
          password: 'password',
        };
        let mappedAnyField = false;
        for (const [backendField, formField] of Object.entries(fieldMap)) {
          const message = error.fieldErrors[backendField]?.[0];
          if (message && formField) {
            form.setError(formField, { message });
            mappedAnyField = true;
          }
        }
        toast({
          title: 'Registration Failed',
          description: mappedAnyField
            ? 'Check the highlighted fields and try again.'
            : error.message,
          tone: 'error',
        });
      } else {
        toast({
          title: 'Registration Failed',
          description: 'An error occurred during workspace creation.',
          tone: 'error',
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-2xl"
    >
      <GlassCard className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-violet-300">
            Get started
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white">
            Launch your predictive CS workspace
          </h1>
          <p className="mt-2 text-zinc-400">
            Set up your team profile and start calibrating the model to your
            retention motion.
          </p>
        </div>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <Field
            label="Full name"
            icon={<UserRound className="h-4 w-4" />}
            error={form.formState.errors.fullName?.message}
          >
            <Input placeholder="Ari Johnson" disabled={submitting} {...form.register('fullName')} />
          </Field>
          <Field
            label="Company"
            icon={<Building2 className="h-4 w-4" />}
            error={form.formState.errors.companyName?.message}
          >
            <Input
              placeholder="Foresight Labs"
              disabled={submitting}
              {...form.register('companyName')}
            />
          </Field>
          <Field
            label="Work email"
            icon={<Mail className="h-4 w-4" />}
            error={form.formState.errors.email?.message}
          >
            <Input
              type="email"
              placeholder="you@company.com"
              disabled={submitting}
              {...form.register('email')}
            />
          </Field>
          <Field
            label="Username"
            icon={<UserRound className="h-4 w-4" />}
            error={form.formState.errors.username?.message}
          >
            <Input
              placeholder="ari.johnson"
              disabled={submitting}
              {...form.register('username')}
            />
          </Field>
          <Field
            label="Role"
            icon={<BriefcaseBusiness className="h-4 w-4" />}
            error={form.formState.errors.role?.message}
          >
            <select
              disabled={submitting}
              className={cn(
                'h-11 w-full rounded-2xl border border-white/10 bg-[#0c0d0f] px-4 text-sm text-white outline-none focus:border-emerald-400/50'
              )}
              {...form.register('role')}
            >
              <option value="Customer Success Manager">
                Customer Success Manager
              </option>
              <option value="Founder">
                Founder
              </option>
              <option value="Operations Lead">
                Operations Lead
              </option>
              <option value="RevOps Analyst">
                RevOps Analyst
              </option>
            </select>
          </Field>
          <Field
            label="Password"
            icon={<LockKeyhole className="h-4 w-4" />}
            error={form.formState.errors.password?.message}
            className="md:col-span-2"
          >
            <Input
              type="password"
              placeholder="Create a secure password"
              disabled={submitting}
              {...form.register('password')}
            />
          </Field>
          <div className="md:col-span-2">
            <Button className="w-full" type="submit" disabled={submitting}>
              {submitting ? 'Initializing workspace...' : 'Create your workspace'}
            </Button>
          </div>
        </form>
        <p className="text-sm text-zinc-400">
          Already using ForesightCS?{' '}
          <Link className="text-violet-300 hover:text-violet-200 transition-colors" href="/login">
            Go to sign in
          </Link>
        </p>
      </GlassCard>
    </motion.div>
  );
}

function Field({
  label,
  icon,
  error,
  className,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn('space-y-2 block', className)}>
      <span className="flex items-center gap-2 text-sm text-zinc-300">
        {icon}
        {label}
      </span>
      {children}
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
    </label>
  );
}
