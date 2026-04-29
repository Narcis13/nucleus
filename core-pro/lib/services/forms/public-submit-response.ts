import "server-only"

import { createHash } from "node:crypto"

import { and, eq, isNull, lt, or, sql } from "drizzle-orm"

import { evaluateTrigger } from "@/lib/automations/engine"
import { dbAdmin } from "@/lib/db/client"
import { formPublicShares, formResponses, forms } from "@/lib/db/schema"
import { validateFormResponse } from "@/lib/forms/validate"
import { trackServerEvent } from "@/lib/posthog/events"
import type { FormResponseData, FormSchema } from "@/types/forms"

import { NotFoundError, ServiceError } from "../_lib/errors"

export type PublicSubmitFormResponseInput = {
  token: string
  data: Record<string, string | number | string[] | null>
}

export type PublicSubmitFormResponseResult = { responseId: string }

// ─────────────────────────────────────────────────────────────────────────────
// publicSubmitFormResponse
//
// Anonymous submission path for tokenized public shares. Trust boundary is
// the raw token (32 random bytes); we hash it and look up the share. Uses
// `dbAdmin` since the caller has no Clerk JWT and the public share table
// has no public-readable RLS policy.
//
// Atomic capacity-check: the UPDATE-RETURNING on form_public_shares both
// reserves a slot and validates revoke/expiry/max in a single statement, so
// concurrent submitters can't both squeeze through the last slot.
// ─────────────────────────────────────────────────────────────────────────────
export async function publicSubmitFormResponse(
  input: PublicSubmitFormResponseInput,
): Promise<PublicSubmitFormResponseResult> {
  const tokenHash = createHash("sha256").update(input.token).digest()

  // Step 1: atomically reserve a response slot. If 0 rows update, the share
  // is revoked / expired / exhausted / not found — all surfaced as the same
  // user-facing error to avoid leaking which condition tripped.
  const reserved = await dbAdmin
    .update(formPublicShares)
    .set({ responseCount: sql`${formPublicShares.responseCount} + 1` })
    .where(
      and(
        eq(formPublicShares.tokenHash, tokenHash),
        isNull(formPublicShares.revokedAt),
        or(
          isNull(formPublicShares.expiresAt),
          // expiresAt > now()
          sql`${formPublicShares.expiresAt} > now()`,
        ),
        lt(formPublicShares.responseCount, formPublicShares.maxResponses),
      ),
    )
    .returning({
      id: formPublicShares.id,
      formId: formPublicShares.formId,
      professionalId: formPublicShares.professionalId,
      subjectClientId: formPublicShares.subjectClientId,
    })
  const share = reserved[0]
  if (!share) {
    throw new NotFoundError("This link is no longer valid.")
  }

  // Step 2: load the form to validate the payload against its schema.
  const [form] = await dbAdmin
    .select()
    .from(forms)
    .where(eq(forms.id, share.formId))
    .limit(1)
  if (!form || !form.isActive) {
    // Roll back the reservation we just made — refund the slot so the share
    // isn't permanently burned by an inactive form.
    await dbAdmin
      .update(formPublicShares)
      .set({ responseCount: sql`${formPublicShares.responseCount} - 1` })
      .where(eq(formPublicShares.id, share.id))
    throw new NotFoundError("This form is no longer available.")
  }

  const errors = validateFormResponse(
    form.schema as FormSchema,
    input.data as FormResponseData,
  )
  if (Object.keys(errors).length > 0) {
    // Refund the reservation; the submitter can fix and retry.
    await dbAdmin
      .update(formPublicShares)
      .set({ responseCount: sql`${formPublicShares.responseCount} - 1` })
      .where(eq(formPublicShares.id, share.id))
    const firstKey = Object.keys(errors)[0]
    throw new ServiceError(errors[firstKey])
  }

  // Step 3: insert the response.
  const [response] = await dbAdmin
    .insert(formResponses)
    .values({
      formId: share.formId,
      shareId: share.id,
      subjectClientId: share.subjectClientId,
      clientId: null,
      data: input.data as FormResponseData,
    })
    .returning({ id: formResponses.id })
  if (!response) throw new ServiceError("Failed to save response.")

  // Trigger evaluation — the automation engine already handles nullable
  // clientId for `form_submitted`. Pass the subject client so owner-scoped
  // automations (tag filters etc.) still match when relevant.
  void evaluateTrigger("form_submitted", {
    type: "form_submitted",
    professionalId: share.professionalId,
    clientId: share.subjectClientId,
    formId: share.formId,
    assignmentId: share.id,
  }).catch(() => {})

  try {
    await trackServerEvent("form_submitted", {
      distinctId: `share_${share.id}`,
      professionalId: share.professionalId,
      formId: share.formId,
      assignmentId: share.id,
      clientId: share.subjectClientId,
    })
  } catch {
    // analytics best-effort
  }

  return { responseId: response.id }
}
