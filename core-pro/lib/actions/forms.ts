"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { authedAction } from "@/lib/actions/safe-action"
import { archiveForm } from "@/lib/services/forms/archive"
import { assignForm } from "@/lib/services/forms/assign"
import { createForm } from "@/lib/services/forms/create"
import { submitFormResponse } from "@/lib/services/forms/submit-response"
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
// Actions — Client side
// ─────────────────────────────────────────────────────────────────────────────
export const submitFormResponseAction = authedAction
  .metadata({ actionName: "forms.submitResponse" })
  .inputSchema(submitResponseSchema)
  .action(async ({ ctx, parsedInput }) => {
    const result = await submitFormResponse(ctx, parsedInput)
    revalidatePath("/portal/forms")
    revalidatePath(`/portal/forms/${parsedInput.assignmentId}`)
    revalidatePath("/dashboard/forms")
    return result
  })
