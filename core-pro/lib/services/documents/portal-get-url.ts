import "server-only"

import { eq } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { documents } from "@/lib/db/schema"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

import type { PortalActionCtx } from "@/lib/actions/safe-action"
import { NotFoundError, ServiceError, UnauthorizedError } from "../_lib/errors"
import { BUCKET, SIGNED_URL_TTL_SECONDS } from "./_helpers"

export type PortalGetDocumentUrlInput = {
  id: string
  download?: boolean
}

export type PortalGetDocumentUrlResult = { url: string; expiresIn: number }

// Portal-side counterpart to `getSignedDocumentUrl` / `getInlineDocumentUrl`.
// The portal session has no Clerk JWT, so we can't rely on RLS — instead we
// look the row up via `dbAdmin` and explicitly check it belongs to the calling
// client + professional pair from the cookie session.
export async function portalGetDocumentUrl(
  ctx: PortalActionCtx,
  input: PortalGetDocumentUrlInput,
): Promise<PortalGetDocumentUrlResult> {
  const [doc] = await dbAdmin
    .select({
      fileUrl: documents.fileUrl,
      name: documents.name,
      clientId: documents.clientId,
      professionalId: documents.professionalId,
    })
    .from(documents)
    .where(eq(documents.id, input.id))
    .limit(1)

  if (!doc) throw new NotFoundError("Document not found.")
  if (
    doc.professionalId !== ctx.professionalId ||
    doc.clientId !== ctx.clientId
  ) {
    throw new UnauthorizedError("You don't have access to this document.")
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(
      doc.fileUrl,
      SIGNED_URL_TTL_SECONDS,
      input.download ? { download: doc.name } : undefined,
    )
  if (error || !data) {
    throw new ServiceError(error?.message ?? "Couldn't generate link.")
  }
  return { url: data.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS }
}
