import "server-only"

import { eq, sql } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { documents, professionals } from "@/lib/db/schema"

import type { ServiceContext } from "../_lib/context"
import { PlanLimitError, UnauthorizedError } from "../_lib/errors"
import {
  BUCKET,
  buildStorageKey,
  mbToBytes,
  resolveClient,
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
  _ctx: ServiceContext,
  input: PortalPrepareDocumentUploadInput,
): Promise<PortalPrepareDocumentUploadResult> {
  const client = await resolveClient()
  if (!client || !client.professionalId) {
    throw new UnauthorizedError("Unauthorized")
  }

  // Portal uploads count against the professional's storage quota, so we
  // fetch their plan limits (service role — client can't SELECT the pro row
  // directly under RLS) and enforce them here before minting a key.
  const [pro] = await dbAdmin
    .select({
      planLimits: professionals.planLimits,
      plan: professionals.plan,
    })
    .from(professionals)
    .where(eq(professionals.id, client.professionalId))
    .limit(1)
  if (!pro) throw new UnauthorizedError("Unauthorized")
  const limits = resolvePlanLimits(pro.planLimits, pro.plan)
  // dbAdmin bypasses RLS; scope the aggregate by professional_id manually.
  const usageRows = await dbAdmin
    .select({
      total: sql<string>`coalesce(sum(${documents.fileSize}), 0)::bigint`,
    })
    .from(documents)
    .where(eq(documents.professionalId, client.professionalId))
  const usedRaw = usageRows[0]?.total ?? "0"
  const used =
    typeof usedRaw === "string" ? Number.parseInt(usedRaw, 10) : Number(usedRaw)
  const maxBytes = mbToBytes(limits.max_storage_mb)
  if (used + input.fileSize > maxBytes) {
    throw new PlanLimitError(
      "Your professional's storage is full. Ask them to upgrade before uploading new files.",
    )
  }

  const storageKey = buildStorageKey({
    professionalId: client.professionalId,
    clientId: client.id,
    filename: input.filename,
  })
  return { storageKey, bucket: BUCKET }
}
