import "server-only"

import { createDocumentFromClient } from "@/lib/db/queries/documents"

import type { ServiceContext } from "../_lib/context"
import { ServiceError, UnauthorizedError } from "../_lib/errors"
import { resolveClient } from "./_helpers"

export type PortalCreateDocumentInput = {
  storageKey: string
  name: string
  fileSize: number
  fileType?: string
}

export type PortalCreateDocumentResult = { id: string; clientId: string }

// Inserts the metadata row for a file the client has uploaded from the portal.
// Bypasses RLS for the insert (service role) because portal-side inserts would
// need the client-insert policy, which requires the storage key to already be
// tied to a row — chicken-and-egg. We do our own authorization instead.
export async function portalCreateDocument(
  _ctx: ServiceContext,
  input: PortalCreateDocumentInput,
): Promise<PortalCreateDocumentResult> {
  const client = await resolveClient()
  if (!client || !client.professionalId) {
    throw new UnauthorizedError("Unauthorized")
  }
  // Storage key must live under the client's folder so the pro (and only the
  // pro) can read it back.
  const expectedPrefix = `${client.professionalId}/${client.id}/`
  if (!input.storageKey.startsWith(expectedPrefix)) {
    throw new ServiceError("Invalid storage key.")
  }

  const doc = await createDocumentFromClient({
    professionalId: client.professionalId,
    clientId: client.id,
    uploadedBy: client.id,
    name: input.name,
    fileUrl: input.storageKey,
    fileType: input.fileType ?? null,
    fileSize: input.fileSize,
    category: "General",
  })

  return { id: doc.id, clientId: client.id }
}
