import "server-only"

import { eq, sql } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { documents, professionals } from "@/lib/db/schema"

import type { PortalActionCtx } from "@/lib/actions/safe-action"
import { PlanLimitError, ServiceError, UnauthorizedError } from "../_lib/errors"
import { mbToBytes, resolvePlanLimits } from "./_helpers"

export type PortalCreateDocumentInput = {
  storageKey: string
  name: string
  fileSize: number
  fileType?: string
}

export type PortalCreateDocumentResult = { id: string; clientId: string }

// Inserts the metadata row for a file the client has uploaded from the portal.
// Identity comes from the portal cookie session (`ctx.clientId` /
// `ctx.professionalId`) — the storage key must live under that pair's folder
// so the pro (and only the pro) can read it back.
//
// Quota check is atomic with the insert: a transaction-scoped advisory lock
// keyed on the professional id serializes concurrent uploads (portal + agent
// both contend the same key) so the pre-flight + insert cannot interleave.
export async function portalCreateDocument(
  ctx: PortalActionCtx,
  input: PortalCreateDocumentInput,
): Promise<PortalCreateDocumentResult> {
  const expectedPrefix = `${ctx.professionalId}/${ctx.clientId}/`
  if (!input.storageKey.startsWith(expectedPrefix)) {
    throw new ServiceError("Invalid storage key.")
  }

  const lockKey = `doc_quota:${ctx.professionalId}`

  const created = await dbAdmin.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
    )

    const [pro] = await tx
      .select({
        planLimits: professionals.planLimits,
        plan: professionals.plan,
      })
      .from(professionals)
      .where(eq(professionals.id, ctx.professionalId))
      .limit(1)
    if (!pro) throw new UnauthorizedError("Unauthorized")
    const limits = resolvePlanLimits(pro.planLimits, pro.plan)
    const maxBytes = mbToBytes(limits.max_storage_mb)

    const [usedRow] = await tx
      .select({
        total: sql<string>`coalesce(sum(${documents.fileSize}), 0)::bigint`,
      })
      .from(documents)
      .where(eq(documents.professionalId, ctx.professionalId))
    const usedBytes = Number.parseInt(usedRow?.total ?? "0", 10)
    if (usedBytes + input.fileSize > maxBytes) {
      throw new PlanLimitError(
        "Your professional's storage is full. Ask them to upgrade before uploading new files.",
      )
    }

    const [row] = await tx
      .insert(documents)
      .values({
        professionalId: ctx.professionalId,
        clientId: ctx.clientId,
        uploadedBy: ctx.clientId,
        name: input.name,
        fileUrl: input.storageKey,
        fileType: input.fileType ?? null,
        fileSize: input.fileSize,
        category: "General",
      })
      .returning({ id: documents.id })
    if (!row) throw new ServiceError("Failed to insert document")
    return row
  })

  return { id: created.id, clientId: ctx.clientId }
}
