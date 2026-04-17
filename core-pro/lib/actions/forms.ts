"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"
import { z } from "zod"

import { ActionError, authedAction } from "@/lib/actions/safe-action"
import { evaluateTrigger } from "@/lib/automations/engine"
import { trackServerEvent } from "@/lib/posthog/events"
import {
  archiveForm as archiveFormQuery,
  assignFormToClients as assignFormQuery,
  createForm as createFormQuery,
  getExistingAssignmentsForClients,
  getForm,
  submitFormResponse as submitFormResponseQuery,
  updateForm as updateFormQuery,
} from "@/lib/db/queries/forms"
import { formAssignments } from "@/lib/db/schema"
import { validateFormResponse } from "@/lib/forms/validate"
import type { FormResponseData, FormSchema } from "@/types/forms"

// ─────────────────────────────────────────────────────────────────────────────
// Schemas — the form schema itself (what the pro designs) and the response
// data (what the client submits). Kept permissive on value shape: individual
// fields are validated at runtime by lib/forms/validate.ts.
// ─────────────────────────────────────────────────────────────────────────────
const fieldSchema = z.object({
  id: z.string().min(1).max(60),
  type: z.enum([
    "short_text",
    "long_text",
    "email",
    "phone",
    "number",
    "single_select",
    "multi_select",
    "date",
    "file",
    "slider",
    "signature",
    "section",
  ]),
  label: z.string().min(1).max(300),
  description: z.string().max(600).optional(),
  placeholder: z.string().max(200).optional(),
  required: z.boolean().optional(),
  options: z
    .array(
      z.object({
        value: z.string().min(1).max(100),
        label: z.string().min(1).max(200),
      }),
    )
    .max(50)
    .optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  defaultValue: z
    .union([z.string(), z.number(), z.array(z.string()), z.boolean()])
    .optional(),
})

const formSchemaSchema = z.object({
  version: z.literal(1),
  fields: z.array(fieldSchema).max(100),
  submitLabel: z.string().max(60).optional(),
})

const createFormInputSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(500).optional(),
  schema: formSchemaSchema,
})

const updateFormInputSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  schema: formSchemaSchema.optional(),
})

const assignFormSchema = z.object({
  formId: z.string().uuid(),
  clientIds: z.array(z.string().uuid()).min(1).max(500),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

const submitResponseSchema = z.object({
  assignmentId: z.string().uuid(),
  data: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.array(z.string()), z.null()]),
  ),
})

const idSchema = z.object({ id: z.string().uuid() })

// ─────────────────────────────────────────────────────────────────────────────
// Actions — Professional side
// ─────────────────────────────────────────────────────────────────────────────
export const createFormAction = authedAction
  .metadata({ actionName: "forms.create" })
  .inputSchema(createFormInputSchema)
  .action(async ({ parsedInput }) => {
    const form = await createFormQuery({
      title: parsedInput.title,
      description: parsedInput.description,
      schema: parsedInput.schema as FormSchema,
    })
    revalidatePath("/dashboard/forms")
    return { id: form.id }
  })

export const updateFormAction = authedAction
  .metadata({ actionName: "forms.update" })
  .inputSchema(updateFormInputSchema)
  .action(async ({ parsedInput }) => {
    const { id, ...rest } = parsedInput
    const patch: Record<string, unknown> = {}
    if (rest.title !== undefined) patch.title = rest.title
    if (rest.description !== undefined) patch.description = rest.description
    if (rest.schema !== undefined) patch.schema = rest.schema
    const updated = await updateFormQuery(id, patch)
    if (!updated) throw new ActionError("Form not found.")
    revalidatePath("/dashboard/forms")
    revalidatePath(`/dashboard/forms/${id}/edit`)
    return { id: updated.id }
  })

export const archiveFormAction = authedAction
  .metadata({ actionName: "forms.archive" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput }) => {
    const archived = await archiveFormQuery(parsedInput.id)
    if (!archived) throw new ActionError("Form not found.")
    revalidatePath("/dashboard/forms")
    return { ok: true }
  })

export const assignFormAction = authedAction
  .metadata({ actionName: "forms.assign" })
  .inputSchema(assignFormSchema)
  .action(async ({ parsedInput }) => {
    // Skip clients who already have a pending assignment for this form so we
    // don't double-assign if the pro clicks twice. Completed assignments are
    // re-assignable — they show up as a new row.
    const existing = await getExistingAssignmentsForClients(
      parsedInput.formId,
      parsedInput.clientIds,
    )
    const toAssign = parsedInput.clientIds.filter((id) => !existing.has(id))
    if (toAssign.length === 0) {
      throw new ActionError("These clients already have this form pending.")
    }
    const dueDate = parsedInput.dueDate
      ? new Date(`${parsedInput.dueDate}T23:59:59Z`)
      : null
    const created = await assignFormQuery(
      parsedInput.formId,
      toAssign,
      dueDate,
    )
    revalidatePath("/dashboard/forms")
    revalidatePath(`/dashboard/forms/${parsedInput.formId}/edit`)
    // Clients will see the new assignment on their next portal load.
    revalidatePath("/portal/forms")
    return { assigned: created.length, skipped: existing.size }
  })

// ─────────────────────────────────────────────────────────────────────────────
// Actions — Client side
// ─────────────────────────────────────────────────────────────────────────────
export const submitFormResponseAction = authedAction
  .metadata({ actionName: "forms.submitResponse" })
  .inputSchema(submitResponseSchema)
  .action(async ({ ctx, parsedInput }) => {
    // Load the assignment via the RLS context — clients can only see their
    // own row (policy: form_assignments_client_select), so a mis-targeted id
    // is filtered out here naturally.
    const [assignment] = await ctx.db
      .select()
      .from(formAssignments)
      .where(eq(formAssignments.id, parsedInput.assignmentId))
      .limit(1)
    if (!assignment) throw new ActionError("Assignment not found.")
    if (assignment.status === "completed") {
      throw new ActionError("This form was already submitted.")
    }

    const form = await getForm(assignment.formId)
    if (!form) throw new ActionError("Form not found.")

    const errors = validateFormResponse(
      form.schema as FormSchema,
      parsedInput.data as FormResponseData,
    )
    if (Object.keys(errors).length > 0) {
      // Surface the first error. The portal runs the same validator locally
      // and can highlight per-field before submit; the action is the
      // authoritative gate.
      const firstKey = Object.keys(errors)[0]
      throw new ActionError(errors[firstKey])
    }

    const response = await submitFormResponseQuery({
      assignmentId: assignment.id,
      clientId: assignment.clientId,
      formId: assignment.formId,
      data: parsedInput.data as FormResponseData,
    })

    void evaluateTrigger("form_submitted", {
      type: "form_submitted",
      professionalId: assignment.professionalId,
      clientId: assignment.clientId,
      formId: assignment.formId,
      assignmentId: assignment.id,
    }).catch(() => {})

    const { userId } = await auth()
    if (userId) {
      void trackServerEvent("form_submitted", {
        distinctId: userId,
        professionalId: assignment.professionalId,
        formId: assignment.formId,
        assignmentId: assignment.id,
        clientId: assignment.clientId,
      })
    }

    revalidatePath("/portal/forms")
    revalidatePath(`/portal/forms/${assignment.id}`)
    revalidatePath("/dashboard/forms")
    return { id: response.id }
  })
