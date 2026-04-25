import "server-only"

import { asc, eq } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import {
  getPublishedLeadMagnet,
  recordLeadMagnetDownload,
} from "@/lib/db/queries/marketing"
import { getProfessionalIdForPublishedSlug } from "@/lib/db/queries/micro-sites"
import { leadActivities, leadStages, leads } from "@/lib/db/schema"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

import { NotFoundError, ServiceError } from "../_lib/errors"
import { LEAD_MAGNET_SIGNED_URL_TTL, MARKETING_BUCKET } from "./_lib"

export type RequestLeadMagnetInput = {
  slug: string
  leadMagnetId: string
  fullName: string
  email: string
  phone?: string
  // Honeypot — see micro-sites contact-form for pattern.
  website?: string
}

export type RequestLeadMagnetResult = { ok: true; url: string | null }

// Public-action service — invoked from the micro-site lead-magnet form. There
// is no RLS-scoped Tx and no Clerk session: writes go through `dbAdmin`
// because the row inserts (lead, activity, download) predate any RLS-eligible
// identity. The honeypot short-circuit lives here so any future non-action
// caller (cron import, MCP tool) gets the same spam guard.
export async function requestLeadMagnet(
  input: RequestLeadMagnetInput,
): Promise<RequestLeadMagnetResult> {
  // Honeypot short-circuit — mirrors submitContactFormAction.
  if (input.website && input.website.trim().length > 0) {
    return { ok: true, url: null }
  }

  const resolved = await getProfessionalIdForPublishedSlug(input.slug)
  if (!resolved) throw new NotFoundError("This site isn't live right now.")

  const magnet = await getPublishedLeadMagnet(input.leadMagnetId)
  if (!magnet || magnet.professionalId !== resolved.professionalId) {
    throw new NotFoundError("That download isn't available.")
  }

  // Resolve the first non-won / non-lost stage for this pro's pipeline.
  const stageRows = await dbAdmin
    .select({
      id: leadStages.id,
      isWon: leadStages.isWon,
      isLost: leadStages.isLost,
    })
    .from(leadStages)
    .where(eq(leadStages.professionalId, resolved.professionalId))
    .orderBy(asc(leadStages.position))
  const firstStage =
    stageRows.find((s) => !s.isWon && !s.isLost) ?? stageRows[0]
  if (!firstStage) {
    throw new ServiceError(
      "The professional hasn't set up their pipeline yet — try again later.",
    )
  }

  const [lead] = await dbAdmin
    .insert(leads)
    .values({
      professionalId: resolved.professionalId,
      stageId: firstStage.id,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone || null,
      source: "lead-magnet",
      notes: `Downloaded "${magnet.title}"`,
      metadata: {
        slug: input.slug,
        lead_magnet_id: magnet.id,
        micro_site_id: resolved.siteId,
      },
    })
    .returning()

  if (lead) {
    await dbAdmin.insert(leadActivities).values({
      leadId: lead.id,
      type: "created",
      description: `Lead magnet download — ${magnet.title}`,
      metadata: { source: "lead-magnet", leadMagnetId: magnet.id },
    })
  }

  await recordLeadMagnetDownload({
    leadMagnetId: magnet.id,
    email: input.email,
    fullName: input.fullName,
    phone: input.phone || null,
    leadId: lead?.id ?? null,
  })

  // Mint a short-lived signed URL even though the bucket is public — it lets
  // the browser trigger a straightforward download with the original
  // filename. If signing fails (misconfigured bucket etc.) we still return
  // the public URL as a fallback.
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
    console.error(err, { tags: { action: "marketing.requestLeadMagnet" } })
  }
  if (!url) {
    const admin = getSupabaseAdmin()
    const { data } = admin.storage
      .from(MARKETING_BUCKET)
      .getPublicUrl(magnet.fileKey)
    url = data.publicUrl
  }

  return { ok: true, url }
}
