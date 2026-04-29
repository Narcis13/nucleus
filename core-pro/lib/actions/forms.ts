"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  ActionError,
  authedAction,
  portalAction,
  publicAction,
} from "@/lib/actions/safe-action"
import { apiRateLimit } from "@/lib/ratelimit"
import { archiveForm } from "@/lib/services/forms/archive"
import { assignForm } from "@/lib/services/forms/assign"
import { createForm } from "@/lib/services/forms/create"
import { createPublicShare } from "@/lib/services/forms/create-public-share"
import { exportFormResponses } from "@/lib/services/forms/export-responses"
import { portalSubmitFormResponse } from "@/lib/services/forms/portal-submit-response"
import { publicSubmitFormResponse } from "@/lib/services/forms/public-submit-response"
import { revokePublicShare } from "@/lib/services/forms/revoke-public-share"
import { updateForm } from "@/lib/services/forms/update"
import type { FormSchema } from "@/types/forms"

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

const responseDataSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.array(z.string()), z.null()]),
)

const createPublicShareSchema = z.object({
  formId: z.string().uuid(),
  subjectClientId: z.string().uuid().nullable().optional(),
  subjectAppointmentId: z.string().uuid().nullable().optional(),
  maxResponses: z.number().int().min(1).max(500).optional(),
  // null = never expires; omitted = default (30 days, applied in service).
  expiresInDays: z.number().int().min(1).max(365).nullable().optional(),
})

const submitPublicResponseSchema = z.object({
  // Raw token from the URL — base64url-encoded 32 random bytes (≈43 chars).
  token: z.string().min(20).max(120),
  data: responseDataSchema,
})

const idSchema = z.object({ id: z.string().uuid() })

// ─────────────────────────────────────────────────────────────────────────────
// Actions — Professional side
// ─────────────────────────────────────────────────────────────────────────────
export const createFormAction = authedAction
  .metadata({ actionName: "forms.create" })
  .inputSchema(createFormInputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await createForm(ctx, {
      title: parsedInput.title,
      description: parsedInput.description,
      schema: parsedInput.schema as FormSchema,
    })
    revalidatePath("/dashboard/forms")
    return result
  })

export const updateFormAction = authedAction
  .metadata({ actionName: "forms.update" })
  .inputSchema(updateFormInputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await updateForm(ctx, parsedInput)
    revalidatePath("/dashboard/forms")
    revalidatePath(`/dashboard/forms/${parsedInput.id}/edit`)
    return result
  })

export const archiveFormAction = authedAction
  .metadata({ actionName: "forms.archive" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await archiveForm(ctx, parsedInput)
    revalidatePath("/dashboard/forms")
    return result
  })

export const exportFormResponsesAction = authedAction
  .metadata({ actionName: "forms.exportResponses" })
  .inputSchema(z.object({ formId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    return exportFormResponses(ctx, parsedInput)
  })

export const assignFormAction = authedAction
  .metadata({ actionName: "forms.assign" })
  .inputSchema(assignFormSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await assignForm(ctx, parsedInput)
    revalidatePath("/dashboard/forms")
    revalidatePath(`/dashboard/forms/${parsedInput.formId}/edit`)
    // Clients will see the new assignment on their next portal load.
    revalidatePath("/portal/forms")
    return result
  })

// ─────────────────────────────────────────────────────────────────────────────
// Actions — Client side (portal)
//
// Auth comes from the `nucleus_portal` cookie session. The service layer
// resolves the assignment by `(id, client_id)` so a stolen UUID can't open a
// peer's assignment.
// ─────────────────────────────────────────────────────────────────────────────
export const submitFormResponseAction = portalAction
  .metadata({ actionName: "forms.submitResponse" })
  .inputSchema(submitResponseSchema)
  .action(async ({ ctx, parsedInput }) => {
    const result = await portalSubmitFormResponse(ctx, parsedInput)
    revalidatePath("/portal/forms")
    revalidatePath(`/portal/forms/${parsedInput.assignmentId}`)
    revalidatePath("/dashboard/forms")
    return result
  })

// ─────────────────────────────────────────────────────────────────────────────
// Actions — Public share (third-party fillers like property viewers)
// ─────────────────────────────────────────────────────────────────────────────
export const createPublicShareAction = authedAction
  .metadata({ actionName: "forms.createPublicShare" })
  .inputSchema(createPublicShareSchema)
  .action(async ({ ctx, parsedInput }) => {
    const result = await createPublicShare(ctx, parsedInput)
    revalidatePath(`/dashboard/forms/${parsedInput.formId}/edit`)
    return result
  })

export const revokePublicShareAction = authedAction
  .metadata({ actionName: "forms.revokePublicShare" })
  .inputSchema(z.object({ id: z.string().uuid(), formId: z.string().uuid() }))
  .action(async ({ ctx, parsedInput }) => {
    const result = await revokePublicShare(ctx, { id: parsedInput.id })
    revalidatePath(`/dashboard/forms/${parsedInput.formId}/edit`)
    return result
  })

// Anonymous submission. Extra per-token rate-limit on top of the IP-based
// publicAction limit so a single share can't be brute-forced into burning
// its capacity (each rejected submit still consumes a rate-limit slot).
export const submitPublicFormResponseAction = publicAction
  .metadata({ actionName: "forms.submitPublicResponse" })
  .inputSchema(submitPublicResponseSchema)
  .action(async ({ parsedInput }) => {
    if (apiRateLimit) {
      const tokenKey = `action:forms.submitPublicResponse:token:${parsedInput.token.slice(0, 16)}`
      const { success } = await apiRateLimit.limit(tokenKey)
      if (!success) {
        throw new ActionError("Too many attempts — try again in a moment.")
      }
    }
    const result = await publicSubmitFormResponse(parsedInput)
    return result
  })
