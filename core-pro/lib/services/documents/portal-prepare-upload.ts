import "server-only"

import { eq } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { getPortalProfessionalStorageUsedBytes } from "@/lib/db/queries/portal"
import { professionals } from "@/lib/db/schema"

import type { PortalActionCtx } from "@/lib/actions/safe-action"
import { PlanLimitError, UnauthorizedError } from "../_lib/errors"
import {
  BUCKET,
  buildStorageKey,
  mbToBytes,
  resolvePlanLimits,
} from "./_helpers"

export type PortalPrepareDocumentUploadInput = {
  filename: string
  fileSize: number
  fileType?: string
}

export type PortalPrepareDocumentUploadResult = {
  storageKey: string
  bucket: string
}

// Portal-side counterpart to prepareDocumentUpload. The storage key is
// nested under `<professional_id>/<client_id>/...` so the professional's
// storage RLS picks the file up for reads automatically.
export async function portalPrepareDocumentUpload(
  ctx: PortalActionCtx,
  input: PortalPrepareDocumentUploadInput,
): Promise<PortalPrepareDocumentUploadResult> {
  // Portal uploads count against the professional's storage quota; fetch
  // their plan limits (service role — RLS on `professionals` would block a
  // client SELECT) and enforce them before minting a key.
  const [pro] = await dbAdmin
    .select({
      planLimits: professionals.planLimits,
      plan: professionals.plan,
    })
    .from(professionals)
    .where(eq(professionals.id, ctx.professionalId))
    .limit(1)
  if (!pro) throw new UnauthorizedError("Unauthorized")
  const limits = resolvePlanLimits(pro.planLimits, pro.plan)
  const used = await getPortalProfessionalStorageUsedBytes(ctx.professionalId)
  const maxBytes = mbToBytes(limits.max_storage_mb)
  if (used + input.fileSize > maxBytes) {
    throw new PlanLimitError(
      "Your professional's storage is full. Ask them to upgrade before uploading new files.",
    )
  }

  const storageKey = buildStorageKey({
    professionalId: ctx.professionalId,
    clientId: ctx.clientId,
    filename: input.filename,
  })
  return { storageKey, bucket: BUCKET }
}
