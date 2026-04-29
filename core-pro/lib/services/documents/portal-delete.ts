import "server-only"

import { eq } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { documents } from "@/lib/db/schema"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

import type { PortalActionCtx } from "@/lib/actions/safe-action"
import { NotFoundError, ServiceError, UnauthorizedError } from "../_lib/errors"
import { BUCKET } from "./_helpers"

export type PortalDeleteDocumentInput = { id: string }
export type PortalDeleteDocumentResult = { id: string; clientId: string }

// Portal-side delete. The client may only delete documents they uploaded
// themselves — never something the professional shared with them. We read via
// `dbAdmin` (no Clerk RLS in portal context) and enforce ownership against the
// cookie session's clientId / professionalId.
export async function portalDeleteDocument(
  ctx: PortalActionCtx,
  input: PortalDeleteDocumentInput,
): Promise<PortalDeleteDocumentResult> {
  const [doc] = await dbAdmin
    .select({
      fileUrl: documents.fileUrl,
      clientId: documents.clientId,
      professionalId: documents.professionalId,
      uploadedBy: documents.uploadedBy,
    })
    .from(documents)
    .where(eq(documents.id, input.id))
    .limit(1)

  if (!doc) throw new NotFoundError("Document not found.")
  if (
    doc.professionalId !== ctx.professionalId ||
    doc.clientId !== ctx.clientId ||
    doc.uploadedBy !== ctx.clientId
  ) {
    throw new UnauthorizedError("You can only delete files you uploaded.")
  }

  const admin = getSupabaseAdmin()
  const { error: storageError } = await admin.storage
    .from(BUCKET)
    .remove([doc.fileUrl])
  if (storageError) throw new ServiceError(storageError.message)

  await dbAdmin.delete(documents).where(eq(documents.id, input.id))

  return { id: input.id, clientId: ctx.clientId }
}
