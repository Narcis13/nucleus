import "server-only"

import { getDocument as getDocumentQuery } from "@/lib/db/queries/documents"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError, ServiceError } from "../_lib/errors"
import { BUCKET, SIGNED_URL_TTL_SECONDS } from "./_helpers"

export type GetInlineDocumentUrlInput = { id: string }
export type GetInlineDocumentUrlResult = { url: string; expiresIn: number }

// Same as getSignedDocumentUrl but without forcing download, for inline
// preview (images / PDFs in an <iframe>).
export async function getInlineDocumentUrl(
  _ctx: ServiceContext,
  input: GetInlineDocumentUrlInput,
): Promise<GetInlineDocumentUrlResult> {
  const doc = await getDocumentQuery(input.id)
  if (!doc) throw new NotFoundError("Document not found.")

  const admin = getSupabaseAdmin()
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(doc.fileUrl, SIGNED_URL_TTL_SECONDS)
  if (error || !data) {
    throw new ServiceError(error?.message ?? "Couldn't generate link.")
  }
  return { url: data.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS }
}
