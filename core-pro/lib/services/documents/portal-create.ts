import "server-only"

import { dbAdmin } from "@/lib/db/client"
import { documents } from "@/lib/db/schema"

import type { PortalActionCtx } from "@/lib/actions/safe-action"
import { ServiceError } from "../_lib/errors"

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
export async function portalCreateDocument(
  ctx: PortalActionCtx,
  input: PortalCreateDocumentInput,
): Promise<PortalCreateDocumentResult> {
  const expectedPrefix = `${ctx.professionalId}/${ctx.clientId}/`
  if (!input.storageKey.startsWith(expectedPrefix)) {
    throw new ServiceError("Invalid storage key.")
  }

  const [created] = await dbAdmin
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

  if (!created) throw new ServiceError("Failed to insert document")
  return { id: created.id, clientId: ctx.clientId }
}
