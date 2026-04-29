import "server-only"

import { sql } from "drizzle-orm"

import { getProfessional } from "@/lib/db/queries/professionals"
import { withRLS } from "@/lib/db/rls"
import { documents } from "@/lib/db/schema"

import type { ServiceContext } from "../_lib/context"
import { PlanLimitError, ServiceError, UnauthorizedError } from "../_lib/errors"
import { mbToBytes, resolvePlanLimits } from "./_helpers"

export type CreateDocumentInput = {
  storageKey: string
  name: string
  fileSize: number
  fileType?: string
  category?: string
  clientId?: string | null
}

export type CreateDocumentResult = { id: string }

// Persists the metadata row for a file the browser has already uploaded to
// storage. Runs under RLS so the row's professional_id is implicit. Returns
// the new document's id.
//
// The quota check is atomic with the insert: we take a per-professional
// transaction-scoped advisory lock, recompute the storage sum, and only then
// insert. Two concurrent uploads serialize through the lock, so they cannot
// both clear the pre-flight check and overshoot the plan limit.
export async function createDocument(
  _ctx: ServiceContext,
  input: CreateDocumentInput,
): Promise<CreateDocumentResult> {
  const professional = await getProfessional()
  if (!professional) throw new UnauthorizedError("Unauthorized")

  // Enforce the storage key matches the professional's folder prefix so a
  // client can't swap in another pro's key.
  if (!input.storageKey.startsWith(`${professional.id}/`)) {
    throw new ServiceError("Invalid storage key.")
  }

  const limits = resolvePlanLimits(professional.planLimits, professional.plan)
  const maxBytes = mbToBytes(limits.max_storage_mb)
  const lockKey = `doc_quota:${professional.id}`

  return withRLS(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
    )
    const [usedRow] = await tx
      .select({
        total: sql<string>`coalesce(sum(${documents.fileSize}), 0)::bigint`,
      })
      .from(documents)
    const usedBytes = Number.parseInt(usedRow?.total ?? "0", 10)
    if (usedBytes + input.fileSize > maxBytes) {
      throw new PlanLimitError(
        `Storage limit reached (${limits.max_storage_mb} MB). Upgrade your plan to upload more files.`,
      )
    }

    const [created] = await tx
      .insert(documents)
      .values({
        professionalId: professional.id,
        clientId: input.clientId ?? null,
        uploadedBy: professional.id,
        name: input.name,
        fileUrl: input.storageKey,
        fileType: input.fileType ?? null,
        fileSize: input.fileSize,
        category: input.category ?? "General",
      })
      .returning({ id: documents.id })
    if (!created) throw new ServiceError("Failed to insert document")
    return { id: created.id }
  })
}
