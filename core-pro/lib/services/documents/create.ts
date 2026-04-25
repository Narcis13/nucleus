import "server-only"

import { createDocument as createDocumentQuery } from "@/lib/db/queries/documents"
import { getProfessional } from "@/lib/db/queries/professionals"

import type { ServiceContext } from "../_lib/context"
import { ServiceError, UnauthorizedError } from "../_lib/errors"

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

  const doc = await createDocumentQuery({
    clientId: input.clientId ?? null,
    name: input.name,
    fileUrl: input.storageKey,
    fileType: input.fileType ?? null,
    fileSize: input.fileSize,
    category: input.category ?? "General",
  })

  return { id: doc.id }
}
