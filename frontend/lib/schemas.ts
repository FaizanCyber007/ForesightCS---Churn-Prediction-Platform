import { z } from 'zod';

const passwordSchema = z.string().min(8, 'Password must be at least 8 characters.');

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Enter your email or username.'),
  password: passwordSchema,
});

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name is required.'),
  companyName: z.string().min(2, 'Company name is required.'),
  role: z.enum([
    'Customer Success Manager',
    'Founder',
    'Operations Lead',
    'RevOps Analyst',
  ]),
  email: z.string().email('Enter a valid work email.'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters.')
    .max(150, 'Username must be 150 characters or fewer.')
    .regex(/^[\w.@+-]+$/, 'Username may only contain letters, digits and @/./+/-/_.'),
  password: passwordSchema,
});

/**
 * Mirrors backend/core/serializers.py::UserUpdateSerializer field-for-field
 * (see CLAUDE.md ##3 Front-to-Back Symmetry).
 */
export const profileSettingsSchema = z.object({
  full_name: z.string().min(2, 'Full name is required.').max(255),
  email: z.string().email('Enter a valid work email.'),
  title: z.string().max(100, 'Title must be 100 characters or fewer.'),
});

/**
 * Mirrors backend/core/serializers.py::OrganizationSerializer's writable
 * fields (see CLAUDE.md ##3 Front-to-Back Symmetry). `slug` is read-only
 * there, so it's omitted here.
 */
export const workspaceSettingsSchema = z.object({
  name: z.string().min(2, 'Workspace name is required.').max(255),
});

/**
 * Mirrors backend/rules/serializers.py::HealthRuleSerializer field-for-field
 * (see CLAUDE.md ##3 Front-to-Back Symmetry). `metric_type` is intentionally
 * `z.string()` rather than a fixed `z.enum(...)` -- valid values are fetched
 * dynamically from `GET /api/v1/rules/metric-types/` so the frontend never
 * hardcodes the option list.
 */
export const healthRuleSchema = z.object({
  name: z.string().min(3, 'Rule name must be at least 3 characters.').max(255),
  metric_type: z.string().min(1, 'Select a metric.'),
  threshold: z
    .coerce
    .number()
    .min(0, 'Threshold must be zero or greater.'),
  weight: z.coerce
    .number()
    .int('Weight must be a whole number.')
    .min(1, 'Weight must be greater than 0.')
    .max(100, 'Weight must be 100 or less.'),
});

/**
 * Mirrors backend/customers/serializers.py::CustomerSerializer's writable
 * fields field-for-field (see CLAUDE.md ##3 Front-to-Back Symmetry).
 * `health_score` is intentionally omitted -- the serializer marks it
 * read-only, it can only change via the HealthScoreEngine `/calculate/`
 * action, never a client-supplied value on create.
 */
export const customerSchema = z.object({
  name: z.string().min(2, 'Contact name is required.').max(255),
  company_name: z.string().min(2, 'Company name is required.').max(255),
  segment: z.enum(['SMB', 'Mid-Market', 'Expansion']),
  plan: z.enum(['Starter', 'Growth', 'Scale', 'Enterprise']),
  mrr: z.coerce.number().min(0, 'MRR must be zero or greater.'),
  annual_contract_value: z.coerce
    .number()
    .min(0, 'Annual contract value must be zero or greater.'),
  renewal_date: z.string().min(1, 'Renewal date is required.'),
  nps: z.coerce
    .number()
    .int('NPS must be a whole number.')
    .min(-100, 'NPS must be between -100 and 100.')
    .max(100, 'NPS must be between -100 and 100.'),
  expansion_potential: z.coerce
    .number()
    .int('Expansion potential must be a whole number.')
    .min(0, 'Expansion potential must be between 0 and 100.')
    .max(100, 'Expansion potential must be between 0 and 100.'),
});

/**
 * Mirrors backend/playbooks/serializers.py::PlaybookSerializer's writable
 * fields (see CLAUDE.md ##3 Front-to-Back Symmetry). `customers_in_play` and
 * `last_triggered` are read-only there, so they're omitted here too.
 */
export const playbookSchema = z.object({
  name: z.string().min(2, 'Playbook name must be at least 2 characters.').max(255),
  description: z.string().max(2000, 'Description must be 2000 characters or fewer.'),
  trigger: z.string().min(2, 'Trigger condition is required.').max(255),
  status: z.enum(['active', 'inactive']),
  steps: z
    .array(z.string().min(1, 'Step cannot be empty.').max(500))
    .min(1, 'Add at least one step.'),
});

/**
 * Mirrors backend/tasks/serializers.py::TaskSerializer's writable fields
 * (see CLAUDE.md ##3 Front-to-Back Symmetry). `related_customer` is a
 * read-only SerializerMethodField there, so it's omitted here.
 */
export const taskSchema = z.object({
  title: z.string().min(2, 'Task title must be at least 2 characters.').max(255),
  description: z.string().max(2000, 'Description must be 2000 characters or fewer.'),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  status: z.enum(['Open', 'In Progress', 'Completed']),
  due_date: z.string().min(1, 'Due date is required.'),
  type: z.enum(['Manual', 'Automated Playbook', 'System Alert']),
  customer: z.string().uuid().optional().nullable(),
});

/**
 * Mirrors backend/contacts/serializers.py::ContactSerializer's writable
 * fields (see CLAUDE.md ##3 Front-to-Back Symmetry), minus `customer` --
 * the form this backs is always scoped to one customer's detail page, so
 * the customer id is supplied by the Server Action, not the form itself.
 */
export const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.').max(255),
  role: z.string().max(255),
  email: z.string().email('Enter a valid email.'),
  phone: z.string().max(32),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ProfileSettingsFormValues = z.infer<typeof profileSettingsSchema>;
export type WorkspaceSettingsFormValues = z.infer<typeof workspaceSettingsSchema>;
export type HealthRuleFormValues = z.infer<typeof healthRuleSchema>;
export type CustomerFormValues = z.infer<typeof customerSchema>;
export type PlaybookFormValues = z.infer<typeof playbookSchema>;
export type TaskFormValues = z.infer<typeof taskSchema>;
export type ContactFormValues = z.infer<typeof contactSchema>;
