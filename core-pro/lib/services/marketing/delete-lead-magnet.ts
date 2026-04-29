import "server-only"

import { and, eq } from "drizzle-orm"

import { logError } from "@/lib/audit/log"
import { dbAdmin } from "@/lib/db/client"
import { deleteLeadMagnet as deleteLeadMagnetQuery } from "@/lib/db/queries/marketing"
import { getProfessional } from "@/lib/db/queries/professionals"
import { leadMagnets } from "@/lib/db/schema"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

import type { ServiceContext } from "../_lib/context"
import {
  NotFoundError,
  ServiceError,
  UnauthorizedError,
} from "../_lib/errors"
import { MARKETING_BUCKET } from "./_lib"

export type DeleteLeadMagnetInput = { id: string }
export type DeleteLeadMagnetResult = { ok: true }

export async function deleteLeadMagnet(
  _ctx: ServiceContext,
  input: DeleteLeadMagnetInput,
): Promise<DeleteLeadMagnetResult> {
  const professional = await getProfessional()
  if (!professional) throw new UnauthorizedError("Unauthorized")
  const [row] = await dbAdmin
    .select({ fileKey: leadMagnets.fileKey })
    .from(leadMagnets)
    .where(
      and(
        eq(leadMagnets.id, input.id),
        eq(leadMagnets.professionalId, professional.id),
      ),
    )
    .limit(1)
  if (!row) throw new NotFoundError("Lead magnet not found.")

  // Best-effort storage cleanup — we don't want a stale file behind if the
  // row goes away.
  try {
    await getSupabaseAdmin().storage.from(MARKETING_BUCKET).remove([row.fileKey])
  } catch (err) {
    logError(err, {
      source: "service:marketing.deleteLeadMagnet",
      professionalId: professional.id,
      metadata: { leadMagnetId: input.id },
    })
  }

  const ok = await deleteLeadMagnetQuery(input.id)
  if (!ok) throw new ServiceError("Couldn't delete lead magnet.")
  return { ok: true }
}
