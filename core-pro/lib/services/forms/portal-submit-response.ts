import "server-only"

import { and, eq } from "drizzle-orm"

import { evaluateTrigger } from "@/lib/automations/engine"
import { formAssignments, formResponses, forms } from "@/lib/db/schema"
import { validateFormResponse } from "@/lib/forms/validate"
import { trackServerEvent } from "@/lib/posthog/events"
import type { FormResponseData, FormSchema } from "@/types/forms"

import type { PortalActionCtx } from "@/lib/actions/safe-action"
import { NotFoundError, ServiceError } from "../_lib/errors"

export type PortalSubmitFormResponseInput = {
  assignmentId: string
  data: Record<string, string | number | string[] | null>
}

export type PortalSubmitFormResponseResult = { id: string }

// Portal counterpart to `submitFormResponse`. Looks up the assignment by id +
// `client_id` (from the session) — RLS isn't applied here because the cookie
// session, not Clerk, is the trust boundary.
export async function portalSubmitFormResponse(
  ctx: PortalActionCtx,
  input: PortalSubmitFormResponseInput,
): Promise<PortalSubmitFormResponseResult> {
  const [assignment] = await ctx.db
    .select()
    .from(formAssignments)
    .where(
      and(
        eq(formAssignments.id, input.assignmentId),
        eq(formAssignments.clientId, ctx.clientId),
      ),
    )
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
      distinctId: `client_${ctx.clientId}`,
      professionalId: assignment.professionalId,
      formId: assignment.formId,
      assignmentId: assignment.id,
      clientId: assignment.clientId,
    })
  } catch {
    // analytics best-effort
  }

  return { id: response.id }
}
