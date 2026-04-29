import "server-only"

import { updateDocument as updateDocumentQuery } from "@/lib/db/queries/documents"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError } from "../_lib/errors"

export type RenameDocumentInput = {
  id: string
  name?: string
  category?: string
}

export type RenameDocumentResult = { id: string }

// Rename + optional category re-categorization. No-op (returns the input id)
// when neither field is provided so the action contract stays byte-identical.
export async function renameDocument(
  _ctx: ServiceContext,
  input: RenameDocumentInput,
): Promise<RenameDocumentResult> {
  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) patch.name = input.name
  if (input.category !== undefined) patch.category = input.category
  if (Object.keys(patch).length === 0) return { id: input.id }
  const updated = await updateDocumentQuery(input.id, patch)
  if (!updated) throw new NotFoundError("Document not found.")
  return { id: updated.id }
}
