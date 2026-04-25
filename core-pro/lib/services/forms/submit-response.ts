import "server-only"

import { eq } from "drizzle-orm"

import { evaluateTrigger } from "@/lib/automations/engine"
import { formAssignments, formResponses, forms } from "@/lib/db/schema"
import { validateFormResponse } from "@/lib/forms/validate"
import { trackServerEvent } from "@/lib/posthog/events"
import type { FormResponseData, FormSchema } from "@/types/forms"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError, ServiceError } from "../_lib/errors"

export type SubmitFormResponseInput = {
  assignmentId: string
  data: Record<string, string | number | string[] | null>
}

export type SubmitFormResponseResult = { id: string }

export async function submitFormResponse(
  ctx: ServiceContext,
  input: SubmitFormResponseInput,
): Promise<SubmitFormResponseResult> {
  // Load the assignment via the RLS context — clients can only see their
  // own row (policy: form_assignments_client_select), so a mis-targeted id
  // is filtered out here naturally.
  const [assignment] = await ctx.db
    .select()
    .from(formAssignments)
    .where(eq(formAssignments.id, input.assignmentId))
    .limit(1)
  if (!assignment) throw new NotFoundError("Assignment not found.")
  if (assignment.status === "completed") {
    throw new ServiceError("This form was already submitted.")
  }

  const [form] = await ctx.db
    .select()
    .from(forms)
    .where(eq(forms.id, assignment.formId))
    .limit(1)
  if (!form) throw new NotFoundError("Form not found.")

  const errors = validateFormResponse(
    form.schema as FormSchema,
    input.data as FormResponseData,
  )
  if (Object.keys(errors).length > 0) {
    // Surface the first error. The portal runs the same validator locally
    // and can highlight per-field before submit; the action is the
    // authoritative gate.
    const firstKey = Object.keys(errors)[0]
    throw new ServiceError(errors[firstKey])
  }

  const [response] = await ctx.db
    .insert(formResponses)
    .values({
      assignmentId: assignment.id,
      clientId: assignment.clientId,
      formId: assignment.formId,
      data: input.data as FormResponseData,
    })
    .returning()
  if (!response) throw new ServiceError("Failed to save response.")

  await ctx.db
    .update(formAssignments)
    .set({ status: "completed" })
    .where(eq(formAssignments.id, assignment.id))

  void evaluateTrigger("form_submitted", {
    type: "form_submitted",
    professionalId: assignment.professionalId,
    clientId: assignment.clientId,
    formId: assignment.formId,
    assignmentId: assignment.id,
  }).catch(() => {})

  try {
    await trackServerEvent("form_submitted", {
      distinctId: ctx.userId,
      professionalId: assignment.professionalId,
      formId: assignment.formId,
      assignmentId: assignment.id,
      clientId: assignment.clientId,
    })
  } catch {
    // Analytics failures must not block form submission.
  }

  return { id: response.id }
}
