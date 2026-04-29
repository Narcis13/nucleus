import "server-only"

import {
  deleteDocument as deleteDocumentQuery,
  getDocument as getDocumentQuery,
} from "@/lib/db/queries/documents"
import { createSupabaseServer } from "@/lib/supabase/server"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError, ServiceError } from "../_lib/errors"
import { BUCKET } from "./_helpers"

export type DeleteDocumentInput = { id: string }
export type DeleteDocumentResult = { id: string; clientId: string | null }

// Removes the storage object and DB row atomically. If the storage delete
// fails we surface it, but if the DB row was already gone we treat the
// request as idempotent success. Returns the row's clientId so the action
// shell can revalidate the matching client page.
export async function deleteDocument(
  _ctx: ServiceContext,
  input: DeleteDocumentInput,
): Promise<DeleteDocumentResult> {
  const doc = await getDocumentQuery(input.id)
  if (!doc) throw new NotFoundError("Document not found.")

  // Use user-scoped server client so RLS on storage.objects still applies
  // (a rogue row can't delete another pro's file even if somehow reached).
  const supabase = await createSupabaseServer()
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([doc.fileUrl])
  if (storageError) {
    throw new ServiceError(storageError.message)
  }

  await deleteDocumentQuery(input.id)

  return { id: input.id, clientId: doc.clientId ?? null }
}
