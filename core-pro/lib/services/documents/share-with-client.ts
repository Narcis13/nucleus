import "server-only"

import { updateDocument as updateDocumentQuery } from "@/lib/db/queries/documents"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError } from "../_lib/errors"

export type ShareDocumentWithClientInput = {
  id: string
  clientId: string | null
}

export type ShareDocumentWithClientResult = {
  id: string
  clientId: string | null
}

// Sets (or clears) the clientId on an existing document row. RLS ensures the
// caller owns the document.
export async function shareDocumentWithClient(
  _ctx: ServiceContext,
  input: ShareDocumentWithClientInput,
): Promise<ShareDocumentWithClientResult> {
  const updated = await updateDocumentQuery(input.id, {
    clientId: input.clientId,
  })
  if (!updated) throw new NotFoundError("Document not found.")
  return { id: updated.id, clientId: input.clientId }
}
