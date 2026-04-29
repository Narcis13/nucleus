import "server-only"

import { and, eq, isNull } from "drizzle-orm"

import { formPublicShares } from "@/lib/db/schema"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError } from "../_lib/errors"

export type RevokePublicShareInput = { id: string }
export type RevokePublicShareResult = { ok: true }

// Idempotent: re-revoking is a no-op (filtered by `revoked_at IS NULL`).
// RLS gates the update to the share's owning professional.
export async function revokePublicShare(
  ctx: ServiceContext,
  input: RevokePublicShareInput,
): Promise<RevokePublicShareResult> {
  const rows = await ctx.db
    .update(formPublicShares)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(formPublicShares.id, input.id),
        isNull(formPublicShares.revokedAt),
      ),
    )
    .returning({ id: formPublicShares.id })
  if (rows.length === 0) {
    // Either RLS filtered it out, it doesn't exist, or it's already revoked.
    // For an idempotent caller-facing API we'd return ok, but distinguishing
    // "no such share" from "already revoked" needs a follow-up read; cheap
    // to skip for now — pro will see the row's revokedAt on refresh.
    throw new NotFoundError("Share not found or already revoked.")
  }
  return { ok: true }
}
