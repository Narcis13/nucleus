import "server-only"

import { asc, eq } from "drizzle-orm"

import { logError } from "@/lib/audit/log"
import { dbAdmin } from "@/lib/db/client"
import {
  attachLeadIdToClaim,
  consumeLeadMagnetClaim,
  getPublishedLeadMagnet,
  recordLeadMagnetDownload,
} from "@/lib/db/queries/marketing"
import { leadActivities, leadStages, leads } from "@/lib/db/schema"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

import { ServiceError } from "../_lib/errors"
import { LEAD_MAGNET_SIGNED_URL_TTL, MARKETING_BUCKET } from "./_lib"

export type ClaimLeadMagnetResult =
  | { ok: true; url: string }
  | { ok: false; reason: "expired" | "magnet_gone" | "no_pipeline" }

// ─────────────────────────────────────────────────────────────────────────────
// claimLeadMagnet
//
// The second half of double opt-in: the visitor clicked the link in their
// inbox, which proves the email is real. We:
//   1. Atomically mark the claim row used (single-use; race-safe).
//   2. Create the lead in the pro's pipeline, tagged with a `lead-magnet`
//      source + the claim/magnet metadata.
//   3. Log a lead activity for the timeline.
//   4. Insert the download row + bump `download_count`.
//   5. Mint a short-lived signed URL the route handler will 303-redirect to.
//
// All side effects use `dbAdmin` because the visitor has no Clerk session.
// The conditional UPDATE inside `consumeLeadMagnetClaim` is what stops a
// leaked link from being replayed.
// ─────────────────────────────────────────────────────────────────────────────
export async function claimLeadMagnet(args: {
  tokenHash: Buffer
}): Promise<ClaimLeadMagnetResult> {
  const claim = await consumeLeadMagnetClaim(args.tokenHash)
  if (!claim) return { ok: false, reason: "expired" }

  const magnet = await getPublishedLeadMagnet(claim.leadMagnetId)
  if (!magnet || magnet.professionalId !== claim.professionalId) {
    return { ok: false, reason: "magnet_gone" }
  }

  const stageRows = await dbAdmin
    .select({
      id: leadStages.id,
      isWon: leadStages.isWon,
      isLost: leadStages.isLost,
    })
    .from(leadStages)
    .where(eq(leadStages.professionalId, claim.professionalId))
    .orderBy(asc(leadStages.position))
  const firstStage =
    stageRows.find((s) => !s.isWon && !s.isLost) ?? stageRows[0]
  if (!firstStage) return { ok: false, reason: "no_pipeline" }

  const [lead] = await dbAdmin
    .insert(leads)
    .values({
      professionalId: claim.professionalId,
      stageId: firstStage.id,
      fullName: claim.fullName,
      email: claim.email,
      phone: claim.phone || null,
      source: "lead-magnet",
      notes: `Downloaded "${magnet.title}"`,
      metadata: {
        slug: claim.slug,
        lead_magnet_id: magnet.id,
        claim_id: claim.id,
        verified_email: true,
      },
    })
    .returning()

  if (lead) {
    await dbAdmin.insert(leadActivities).values({
      leadId: lead.id,
      type: "created",
      description: `Lead magnet download (verified) — ${magnet.title}`,
      metadata: { source: "lead-magnet", leadMagnetId: magnet.id },
    })
    await attachLeadIdToClaim(claim.id, lead.id)
  }

  await recordLeadMagnetDownload({
    leadMagnetId: magnet.id,
    email: claim.email,
    fullName: claim.fullName,
    phone: claim.phone || null,
    leadId: lead?.id ?? null,
  })

  // Mint a signed URL for the redirect. The bucket is public, but signing
  // gives us a clean download with the original filename and a short window.
  let url: string | null = null
  try {
    const admin = getSupabaseAdmin()
    const { data } = await admin.storage
      .from(MARKETING_BUCKET)
      .createSignedUrl(magnet.fileKey, LEAD_MAGNET_SIGNED_URL_TTL, {
        download: magnet.fileName,
      })
    url = data?.signedUrl ?? null
  } catch (err) {
    logError(err, {
      source: "service:marketing.claimLeadMagnet",
      professionalId: claim.professionalId,
      metadata: { leadMagnetId: magnet.id },
    })
  }
  if (!url) {
    const admin = getSupabaseAdmin()
    const { data } = admin.storage
      .from(MARKETING_BUCKET)
      .getPublicUrl(magnet.fileKey)
    url = data.publicUrl
  }

  if (!url) {
    throw new ServiceError("Couldn't prepare the download — try again shortly.")
  }

  return { ok: true, url }
}
