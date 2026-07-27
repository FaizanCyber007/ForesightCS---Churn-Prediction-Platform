'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  updateTaskStatus,
  addCustomerNote,
  recalculateCustomerHealth,
  createCustomer,
  createTask,
  updateTask,
  createContact,
  updateContact,
  deleteContact,
  type CustomerRecord,
  type CustomerContact,
  type Task,
} from '@/services/api';
import { createHealthRule, deleteHealthRule, type HealthRule } from '@/services/rules';
import { createPlaybook, updatePlaybook, type Playbook } from '@/services/playbooks';
import { getOrganizationCustomers, reactivateOrganization, suspendOrganization, type OrganizationRecord } from '@/services/admin';
import {
  getWorkspace,
  isCurrentUserSuperuser,
  updateUserProfile,
  updateWorkspace,
  type WorkspaceRecord,
} from '@/services/auth';
import type { UserSession } from '@/context/auth-context';
import { ApiError, type ApiFieldErrors } from '@/lib/apiClient';
import {
  healthRuleSchema,
  customerSchema,
  playbookSchema,
  taskSchema,
  contactSchema,
  profileSettingsSchema,
  workspaceSettingsSchema,
} from '@/lib/schemas';

/**
 * Server Action that triggers the backend HealthScoreEngine for one
 * customer (services.py) and revalidates paths so the new score is reflected.
 */
export async function recalculateHealthScoreAction(id: string) {
  const updated = await recalculateCustomerHealth(id);
  if (!updated) {
    throw new Error('Customer not found.');
  }
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/customers');
  revalidatePath(`/dashboard/customer/${id}`);
  return updated;
}

/**
 * Server Action to update a task's status. `customerId` is optional so
 * callers scoped to one customer (Customer 360's Playbook checklist) can
 * also revalidate that page, not just the tasks inbox.
 */
export async function updateTaskStatusAction(
  id: string,
  status: 'Open' | 'In Progress' | 'Completed',
  customerId?: string
) {
  await updateTaskStatus(id, status);
  revalidatePath('/dashboard/tasks');
  if (customerId) {
    revalidatePath(`/dashboard/customer/${customerId}`);
  }
}

export async function addCustomerNoteAction(customerId: string, note: string) {
  if (!note.trim() || !customerId) return;
  await addCustomerNote(customerId, note);
  revalidatePath(`/dashboard/customer/${customerId}`);
}

const marketingContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

export async function submitContactFormAction(data: z.infer<typeof marketingContactSchema>) {
  const parsed = marketingContactSchema.safeParse(data);
  if (!parsed.success) {
    return { error: 'Invalid form data' };
  }
  
  // Simulate network delay / DB write
  await new Promise(r => setTimeout(r, 800));
  
  // In a real app, send an email or store in DB here
  return { success: true };
}

export type FormActionResult<T> =
  | { success: true; data: T }
  | { success: false; fieldErrors: ApiFieldErrors };

/**
 * Shared by every form-backed Server Action below: turns a failed Zod
 * `safeParse` into the same `ApiFieldErrors` shape DRF 400 payloads
 * normalize to (see `lib/apiClient.ts::normalizeFieldErrors`), so a client
 * component can render either source of error under the relevant input
 * with one code path.
 */
function zodIssuesToFieldErrors(issues: z.ZodIssue[]): ApiFieldErrors {
  const fieldErrors: ApiFieldErrors = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? 'non_field_errors');
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }
  return fieldErrors;
}

/**
 * Server Action backing the Rule Builder form. Re-validates with the same
 * Zod schema the client uses (front-to-back symmetry, CLAUDE.md ##3), then
 * forwards to DRF with a fresh Idempotency-Key. Both Zod issues and DRF 400
 * payloads are normalized into the same `fieldErrors` shape so the client
 * can render either under the relevant input with one code path.
 */
export async function createHealthRuleAction(
  values: unknown
): Promise<FormActionResult<HealthRule>> {
  const parsed = healthRuleSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, fieldErrors: zodIssuesToFieldErrors(parsed.error.issues) };
  }

  try {
    const rule = await createHealthRule(parsed.data, crypto.randomUUID());
    revalidatePath('/dashboard/rules');
    return { success: true, data: rule };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, fieldErrors: error.fieldErrors };
    }
    throw error;
  }
}

export async function deleteHealthRuleAction(id: string) {
  await deleteHealthRule(id);
  revalidatePath('/dashboard/rules');
}

/**
 * Server Action backing the "Add Customer" modal (dashboard/customers).
 * Re-validates with the same Zod schema the client uses (front-to-back
 * symmetry, CLAUDE.md ##3), then forwards to DRF with a fresh
 * Idempotency-Key. Both Zod issues and DRF 400 payloads are normalized
 * into the same `fieldErrors` shape so the client can render either under
 * the relevant input with one code path.
 */
export async function createCustomerAction(
  values: unknown
): Promise<FormActionResult<CustomerRecord>> {
  const parsed = customerSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, fieldErrors: zodIssuesToFieldErrors(parsed.error.issues) };
  }

  try {
    const customer = await createCustomer(parsed.data, crypto.randomUUID());
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/customers');
    revalidatePath('/dashboard/analytics');
    return { success: true, data: customer };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, fieldErrors: error.fieldErrors };
    }
    throw error;
  }
}

/**
 * Manual super-admin override -- mirrors what the Lemon Squeezy
 * `subscription_payment_failed` webhook does automatically
 * (backend/billing/services.py::suspend_organization).
 */
export async function suspendOrganizationAction(id: string): Promise<OrganizationRecord> {
  if (!(await isCurrentUserSuperuser())) {
    throw new Error('Forbidden: superuser access required.');
  }
  const updated = await suspendOrganization(id);
  revalidatePath('/admin');
  return updated;
}

/** Manual super-admin override that reverses `suspendOrganizationAction`. */
export async function reactivateOrganizationAction(id: string): Promise<OrganizationRecord> {
  if (!(await isCurrentUserSuperuser())) {
    throw new Error('Forbidden: superuser access required.');
  }
  const updated = await reactivateOrganization(id);
  revalidatePath('/admin');
  return updated;
}

/** Server Action backing the Super Admin hub's "View customers by organization" dropdown. */
export async function getOrganizationCustomersAction(organizationId: string): Promise<CustomerRecord[]> {
  if (!(await isCurrentUserSuperuser())) {
    throw new Error('Forbidden: superuser access required.');
  }
  return getOrganizationCustomers(organizationId);
}

/** Server Action backing the "New playbook" modal (dashboard/playbooks). */
export async function createPlaybookAction(
  values: unknown
): Promise<FormActionResult<Playbook>> {
  const parsed = playbookSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, fieldErrors: zodIssuesToFieldErrors(parsed.error.issues) };
  }

  try {
    const playbook = await createPlaybook(parsed.data, crypto.randomUUID());
    revalidatePath('/dashboard/playbooks');
    return { success: true, data: playbook };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, fieldErrors: error.fieldErrors };
    }
    throw error;
  }
}

/** Server Action backing the "Edit playbook" modal (dashboard/playbooks). */
export async function updatePlaybookAction(
  id: string,
  values: unknown
): Promise<FormActionResult<Playbook>> {
  const parsed = playbookSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, fieldErrors: zodIssuesToFieldErrors(parsed.error.issues) };
  }

  try {
    const playbook = await updatePlaybook(id, parsed.data);
    revalidatePath('/dashboard/playbooks');
    return { success: true, data: playbook };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, fieldErrors: error.fieldErrors };
    }
    throw error;
  }
}

/** Server Action backing the "New task" modal (dashboard/tasks). */
export async function createTaskAction(values: unknown): Promise<FormActionResult<Task>> {
  const parsed = taskSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, fieldErrors: zodIssuesToFieldErrors(parsed.error.issues) };
  }

  try {
    const task = await createTask(parsed.data, crypto.randomUUID());
    revalidatePath('/dashboard/tasks');
    return { success: true, data: task };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, fieldErrors: error.fieldErrors };
    }
    throw error;
  }
}

/** Server Action backing the "Edit task" modal (dashboard/tasks). */
export async function updateTaskAction(
  id: string,
  values: unknown
): Promise<FormActionResult<Task>> {
  const parsed = taskSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, fieldErrors: zodIssuesToFieldErrors(parsed.error.issues) };
  }

  try {
    const task = await updateTask(id, parsed.data);
    revalidatePath('/dashboard/tasks');
    return { success: true, data: task };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, fieldErrors: error.fieldErrors };
    }
    throw error;
  }
}

/** Server Action backing the "Add contact" modal (dashboard/customer/[id]). */
export async function createContactAction(
  customerId: string,
  values: unknown
): Promise<FormActionResult<CustomerContact>> {
  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, fieldErrors: zodIssuesToFieldErrors(parsed.error.issues) };
  }

  try {
    const contact = await createContact(customerId, parsed.data, crypto.randomUUID());
    revalidatePath(`/dashboard/customer/${customerId}`);
    return { success: true, data: contact };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, fieldErrors: error.fieldErrors };
    }
    throw error;
  }
}

/** Server Action backing the "Edit contact" modal (dashboard/customer/[id]). */
export async function updateContactAction(
  customerId: string,
  contactId: string,
  values: unknown
): Promise<FormActionResult<CustomerContact>> {
  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, fieldErrors: zodIssuesToFieldErrors(parsed.error.issues) };
  }

  try {
    const contact = await updateContact(contactId, parsed.data);
    revalidatePath(`/dashboard/customer/${customerId}`);
    return { success: true, data: contact };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, fieldErrors: error.fieldErrors };
    }
    throw error;
  }
}

export async function deleteContactAction(customerId: string, contactId: string) {
  await deleteContact(contactId);
  revalidatePath(`/dashboard/customer/${customerId}`);
}

/** Server Action backing the Settings -> Profile form. */
export async function updateProfileAction(
  values: unknown
): Promise<FormActionResult<UserSession>> {
  const parsed = profileSettingsSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, fieldErrors: zodIssuesToFieldErrors(parsed.error.issues) };
  }

  try {
    const user = await updateUserProfile(parsed.data);
    revalidatePath('/dashboard/settings');
    return { success: true, data: user };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, fieldErrors: error.fieldErrors };
    }
    throw error;
  }
}

/** Server Action fetching the current workspace for the Settings -> Workspace form. */
export async function getWorkspaceAction(): Promise<WorkspaceRecord> {
  return getWorkspace();
}

/** Server Action backing the Settings -> Workspace form. */
export async function updateWorkspaceAction(
  values: unknown
): Promise<FormActionResult<WorkspaceRecord>> {
  const parsed = workspaceSettingsSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, fieldErrors: zodIssuesToFieldErrors(parsed.error.issues) };
  }

  try {
    const organization = await updateWorkspace(parsed.data);
    revalidatePath('/dashboard/settings');
    return { success: true, data: organization };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, fieldErrors: error.fieldErrors };
    }
    throw error;
  }
}
