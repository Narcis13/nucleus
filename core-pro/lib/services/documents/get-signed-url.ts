import "server-only"

import { getDocument as getDocumentQuery } from "@/lib/db/queries/documents"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError, ServiceError } from "../_lib/errors"
import { BUCKET, SIGNED_URL_TTL_SECONDS } from "./_helpers"

export type GetSignedDocumentUrlInput = { id: string }
export type GetSignedDocumentUrlResult = { url: string; expiresIn: number }

// Returns a 60-minute signed URL for the given document. RLS on the documents
// table gates *which* rows the caller can see; we then use the admin client to
// mint the URL so clients without storage.objects permissions still get a URL
// for files the DB policy already said they're allowed to read.
export async function getSignedDocumentUrl(
  _ctx: ServiceContext,
  input: GetSignedDocumentUrlInput,
): Promise<GetSignedDocumentUrlResult> {
  const doc = await getDocumentQuery(input.id)
  if (!doc) throw new NotFoundError("Document not found.")

  const admin = getSupabaseAdmin()
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(doc.fileUrl, SIGNED_URL_TTL_SECONDS, {
      download: doc.name,
    })
  if (error || !data) {
    throw new ServiceError(error?.message ?? "Couldn't generate link.")
  }
  return { url: data.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS }
}
