import "server-only"

import { createHash, randomBytes } from "node:crypto"

import { eq } from "drizzle-orm"

import { formPublicShares, forms } from "@/lib/db/schema"
import { env } from "@/lib/env"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError, ServiceError } from "../_lib/errors"

export type CreatePublicShareInput = {
  formId: string
  subjectClientId?: string | null
  subjectAppointmentId?: string | null
  // 1 = single-use (default). Cap at a reasonable upper bound to prevent
  // someone setting it to 1M and turning a share into a survey collector.
  maxResponses?: number
  // null = never expires. Default 30 days.
  expiresInDays?: number | null
}

export type CreatePublicShareResult = {
  shareId: string
  url: string
  expiresAt: Date | null
}

const DEFAULT_EXPIRES_DAYS = 30
const MAX_RESPONSES_CAP = 500

// Mints a public share token for a form. Returns the raw URL **once** — we
// only persist sha256(token), so the caller must surface it to the pro
// immediately and not store it anywhere.
export async function createPublicShare(
  ctx: ServiceContext,
  input: CreatePublicShareInput,
): Promise<CreatePublicShareResult> {
  // RLS-scoped lookup proves the form belongs to the calling pro and gives
  // us its professional_id without needing a separate professionals query.
  const [form] = await ctx.db
    .select({
      id: forms.id,
      professionalId: forms.professionalId,
      isActive: forms.isActive,
    })
    .from(forms)
    .where(eq(forms.id, input.formId))
    .limit(1)
  if (!form) throw new NotFoundError("Form not found.")
  if (!form.isActive) {
    throw new ServiceError("Cannot share an archived form.")
  }

  const maxResponses = clampMaxResponses(input.maxResponses)
  const expiresAt =
    input.expiresInDays === null
      ? null
      : new Date(
          Date.now() +
            (input.expiresInDays ?? DEFAULT_EXPIRES_DAYS) *
              24 *
              60 *
              60 *
              1000,
        )

  const rawToken = randomBytes(32).toString("base64url")
  const tokenHash = createHash("sha256").update(rawToken).digest()

  const [row] = await ctx.db
    .insert(formPublicShares)
    .values({
      formId: form.id,
      professionalId: form.professionalId,
      subjectClientId: input.subjectClientId ?? null,
      subjectAppointmentId: input.subjectAppointmentId ?? null,
      tokenHash,
      maxResponses,
      expiresAt,
    })
    .returning({ id: formPublicShares.id })
  if (!row) throw new ServiceError("Failed to create share.")

  const url = new URL(`/share/${rawToken}`, env.NEXT_PUBLIC_APP_URL).toString()
  return { shareId: row.id, url, expiresAt }
}

function clampMaxResponses(value: number | undefined): number {
  if (value === undefined) return 1
  if (!Number.isInteger(value) || value < 1) return 1
  return Math.min(value, MAX_RESPONSES_CAP)
}
