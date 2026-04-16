"use server"

import { and, asc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ActionError, authedAction, publicAction } from "@/lib/actions/safe-action"
import { dbAdmin } from "@/lib/db/client"
import {
  bumpCampaignSentCounter,
  createEmailCampaign as createEmailCampaignQuery,
  createLeadMagnet as createLeadMagnetQuery,
  createSocialTemplate as createSocialTemplateQuery,
  deleteEmailCampaign as deleteEmailCampaignQuery,
  deleteLeadMagnet as deleteLeadMagnetQuery,
  deleteSocialTemplate as deleteSocialTemplateQuery,
  finalizeCampaignSend,
  getEmailCampaign,
  getPublishedLeadMagnet,
  insertRecipients,
  markRecipientSent,
  recordLeadMagnetDownload,
  resolveAudience,
  updateEmailCampaign as updateEmailCampaignQuery,
  updateLeadMagnet as updateLeadMagnetQuery,
  updateSocialTemplate as updateSocialTemplateQuery,
} from "@/lib/db/queries/marketing"
import {
  getProfessionalIdForPublishedSlug,
} from "@/lib/db/queries/micro-sites"
import { getProfessional } from "@/lib/db/queries/professionals"
import {
  leadActivities,
  leadMagnets,
  leadStages,
  leads,
} from "@/lib/db/schema"
import { env } from "@/lib/env"
import { expandMergeTags, type MergeTagContext } from "@/lib/marketing/templates"
import { publicFormRateLimit } from "@/lib/ratelimit"
import { fromAddress, getResend } from "@/lib/resend/client"
import { captureException } from "@/lib/sentry"
import { getPlan, planLimitsFor } from "@/lib/stripe/plans"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import type { EmailCampaignAudience, PlanLimits } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────
const MARKETING_BUCKET = "marketing"
const LEAD_MAGNET_SIGNED_URL_TTL = 60 * 10 // 10 minutes

function resolvePlanLimits(
  planLimits: unknown,
  planId: string | null | undefined,
): PlanLimits {
  if (planLimits && typeof planLimits === "object") return planLimits as PlanLimits
  return planLimitsFor(getPlan(planId))
}

// Per-plan email sends per campaign. Belt-and-suspenders with Resend's own
// account limits — we refuse loudly before queueing the batch.
function maxRecipientsForPlan(planId: string | null | undefined): number {
  switch (planId) {
    case "pro":
      return 2000
    case "growth":
      return 500
    case "enterprise":
      return 10_000
    default:
      return 100
  }
}

function maxLeadMagnetsForPlan(planId: string | null | undefined): number {
  switch (planId) {
    case "pro":
    case "enterprise":
      return 20
    case "growth":
      return 5
    default:
      return 1
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Email campaign schemas
// ─────────────────────────────────────────────────────────────────────────────
const audienceSchema: z.ZodType<EmailCampaignAudience> = z.union([
  z.object({ type: z.literal("all_clients") }),
  z.object({ type: z.literal("tag"), tagId: z.string().uuid() }),
  z.object({ type: z.literal("status"), status: z.string().min(1).max(30) }),
  z.object({ type: z.literal("leads_all") }),
])

const campaignInputSchema = z.object({
  name: z.string().min(1).max(160),
  templateKey: z.string().min(1).max(60),
  subject: z.string().min(1).max(200),
  bodyHtml: z.string().min(1).max(200_000),
  audience: audienceSchema,
  scheduledAt: z
    .string()
    .datetime()
    .nullable()
    .optional(),
})

const campaignUpdateSchema = campaignInputSchema.partial().extend({
  id: z.string().uuid(),
})

const idSchema = z.object({ id: z.string().uuid() })

// ─────────────────────────────────────────────────────────────────────────────
// Email campaign actions
// ─────────────────────────────────────────────────────────────────────────────

export const createEmailCampaignAction = authedAction
  .metadata({ actionName: "marketing.createCampaign" })
  .inputSchema(campaignInputSchema)
  .action(async ({ parsedInput }) => {
    const professional = await getProfessional()
    if (!professional) {
      throw new ActionError("Complete onboarding first.")
    }
    const limits = resolvePlanLimits(professional.planLimits, professional.plan)
    if (!limits.features?.includes("marketing_kit")) {
      throw new ActionError("Your plan doesn't include the marketing kit yet.")
    }

    const campaign = await createEmailCampaignQuery({
      name: parsedInput.name,
      templateKey: parsedInput.templateKey,
      subject: parsedInput.subject,
      bodyHtml: parsedInput.bodyHtml,
      audience: parsedInput.audience,
      status: parsedInput.scheduledAt ? "scheduled" : "draft",
      scheduledAt: parsedInput.scheduledAt
        ? new Date(parsedInput.scheduledAt)
        : null,
    })

    revalidatePath("/dashboard/marketing")
    return { id: campaign.id }
  })

export const updateEmailCampaignAction = authedAction
  .metadata({ actionName: "marketing.updateCampaign" })
  .inputSchema(campaignUpdateSchema)
  .action(async ({ parsedInput }) => {
    const existing = await getEmailCampaign(parsedInput.id)
    if (!existing) throw new ActionError("Campaign not found.")
    if (existing.status === "sent") {
      throw new ActionError("Sent campaigns can't be edited.")
    }

    const patch: Record<string, unknown> = {}
    if (parsedInput.name !== undefined) patch.name = parsedInput.name
    if (parsedInput.templateKey !== undefined)
      patch.templateKey = parsedInput.templateKey
    if (parsedInput.subject !== undefined) patch.subject = parsedInput.subject
    if (parsedInput.bodyHtml !== undefined) patch.bodyHtml = parsedInput.bodyHtml
    if (parsedInput.audience !== undefined) patch.audience = parsedInput.audience
    if (parsedInput.scheduledAt !== undefined) {
      patch.scheduledAt = parsedInput.scheduledAt
        ? new Date(parsedInput.scheduledAt)
        : null
      patch.status = parsedInput.scheduledAt ? "scheduled" : "draft"
    }

    const updated = await updateEmailCampaignQuery(parsedInput.id, patch)
    if (!updated) throw new ActionError("Couldn't update campaign.")
    revalidatePath("/dashboard/marketing")
    return { id: updated.id }
  })

export const deleteEmailCampaignAction = authedAction
  .metadata({ actionName: "marketing.deleteCampaign" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput }) => {
    const existing = await getEmailCampaign(parsedInput.id)
    if (!existing) throw new ActionError("Campaign not found.")
    const ok = await deleteEmailCampaignQuery(parsedInput.id)
    if (!ok) throw new ActionError("Couldn't delete campaign.")
    revalidatePath("/dashboard/marketing")
    return { ok: true }
  })

// ─────────────────────────────────────────────────────────────────────────────
// sendCampaignAction
//
// Resolves the campaign's audience, substitutes merge tags per-recipient, and
// fires via Resend. Delivery is best-effort: per-recipient failures are logged
// and recorded on `email_campaign_recipients.error` — the overall action only
// fails on systemic errors (no API key, over plan limits).
// ─────────────────────────────────────────────────────────────────────────────
export const sendCampaignAction = authedAction
  .metadata({ actionName: "marketing.sendCampaign" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput }) => {
    const professional = await getProfessional()
    if (!professional) throw new ActionError("Complete onboarding first.")
    const limits = resolvePlanLimits(professional.planLimits, professional.plan)
    if (!limits.features?.includes("marketing_kit")) {
      throw new ActionError("Your plan doesn't include sending campaigns.")
    }

    const campaign = await getEmailCampaign(parsedInput.id)
    if (!campaign) throw new ActionError("Campaign not found.")
    if (campaign.status === "sent") {
      throw new ActionError("This campaign has already been sent.")
    }

    const resend = getResend()
    if (!resend) {
      throw new ActionError(
        "Email sending isn't configured. Add RESEND_API_KEY to your environment.",
      )
    }

    const audience = campaign.audience as EmailCampaignAudience
    const recipients = await resolveAudience(audience)
    if (recipients.length === 0) {
      throw new ActionError(
        "That segment has no recipients yet — pick a different audience.",
      )
    }

    const maxRecipients = maxRecipientsForPlan(professional.plan)
    if (recipients.length > maxRecipients) {
      throw new ActionError(
        `Your plan allows up to ${maxRecipients} recipients per campaign. This segment has ${recipients.length}.`,
      )
    }

    // Mark the campaign as sending so the UI reflects it immediately.
    await updateEmailCampaignQuery(campaign.id, { status: "sending" })

    // Pre-insert recipient rows so we always have a per-recipient audit trail,
    // even when a row later fails to deliver. `dbAdmin` bypasses RLS (we're
    // already inside an authed action, and the insert is scoped to our
    // campaign id).
    const rows = recipients.map((r) => ({
      campaignId: campaign.id,
      email: r.email,
      fullName: r.fullName,
      clientId: r.clientId,
      status: "queued" as const,
    }))
    await insertRecipients(rows)

    // Fetch the rows we just inserted so we can update them by id after send.
    const inserted = await dbAdmin.query.emailCampaignRecipients.findMany({
      where: (t, { eq: eqOp }) => eqOp(t.campaignId, campaign.id),
    })
    const byEmail = new Map(inserted.map((r) => [r.email, r]))

    const from = fromAddress()
    const ctxBase: MergeTagContext = {
      professional_name: professional.fullName,
      portal_url: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/portal`,
      booking_url: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/portal/calendar`,
      site_url: env.NEXT_PUBLIC_APP_URL,
    }

    let delivered = 0
    for (const recipient of recipients) {
      const row = byEmail.get(recipient.email)
      if (!row) continue

      const subject = expandMergeTags(campaign.subject, {
        ...ctxBase,
        client_name: recipient.fullName,
      })
      const html = expandMergeTags(campaign.bodyHtml, {
        ...ctxBase,
        client_name: recipient.fullName,
      })

      try {
        const { data, error } = await resend.emails.send({
          from,
          to: [recipient.email],
          subject,
          html,
          headers: {
            "X-Entity-Ref-ID": `campaign:${campaign.id}:${row.id}`,
          },
          tags: [
            { name: "campaign_id", value: campaign.id },
            { name: "professional_id", value: professional.id },
          ],
        })
        if (error || !data) {
          await markRecipientSent({
            id: row.id,
            error: error?.message ?? "Unknown delivery error",
          })
          continue
        }
        await markRecipientSent({
          id: row.id,
          resendMessageId: data.id,
        })
        delivered += 1
        // Flush counter every 25 sends so the UI progresses even on long runs.
        if (delivered % 25 === 0) {
          await bumpCampaignSentCounter(campaign.id, 25)
        }
      } catch (err) {
        captureException(err, { tags: { action: "marketing.sendCampaign" } })
        await markRecipientSent({
          id: row.id,
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    }

    await finalizeCampaignSend(campaign.id, delivered)
    revalidatePath("/dashboard/marketing")
    return { delivered, total: recipients.length }
  })

// ─────────────────────────────────────────────────────────────────────────────
// Social templates
// ─────────────────────────────────────────────────────────────────────────────

const designSchema = z
  .object({
    title: z.string().max(200).optional(),
    body: z.string().max(1200).optional(),
    cta: z.string().max(80).optional(),
    author: z.string().max(80).optional(),
    primaryColor: z.string().max(20).optional(),
    secondaryColor: z.string().max(20).optional(),
    textColor: z.string().max(20).optional(),
    backgroundStyle: z.enum(["solid", "gradient"]).optional(),
    logoUrl: z.string().url().nullable().optional(),
  })
  .passthrough()

const socialTemplateInputSchema = z.object({
  name: z.string().min(1).max(120),
  layout: z.string().min(1).max(60),
  platform: z.enum([
    "instagram_square",
    "instagram_story",
    "linkedin_post",
    "twitter_post",
  ]),
  design: designSchema,
  caption: z.string().max(3000).nullable().optional(),
  hashtags: z.array(z.string().max(60)).max(30).optional(),
})

const socialTemplateUpdateSchema = socialTemplateInputSchema.partial().extend({
  id: z.string().uuid(),
})

export const createSocialTemplateAction = authedAction
  .metadata({ actionName: "marketing.createSocialTemplate" })
  .inputSchema(socialTemplateInputSchema)
  .action(async ({ parsedInput }) => {
    const professional = await getProfessional()
    if (!professional) throw new ActionError("Complete onboarding first.")
    const created = await createSocialTemplateQuery({
      name: parsedInput.name,
      layout: parsedInput.layout,
      platform: parsedInput.platform,
      design: parsedInput.design,
      caption: parsedInput.caption ?? null,
      hashtags: parsedInput.hashtags ?? [],
    })
    revalidatePath("/dashboard/marketing")
    return { id: created.id }
  })

export const updateSocialTemplateAction = authedAction
  .metadata({ actionName: "marketing.updateSocialTemplate" })
  .inputSchema(socialTemplateUpdateSchema)
  .action(async ({ parsedInput }) => {
    const { id, ...rest } = parsedInput
    const patch: Record<string, unknown> = {}
    if (rest.name !== undefined) patch.name = rest.name
    if (rest.layout !== undefined) patch.layout = rest.layout
    if (rest.platform !== undefined) patch.platform = rest.platform
    if (rest.design !== undefined) patch.design = rest.design
    if (rest.caption !== undefined) patch.caption = rest.caption
    if (rest.hashtags !== undefined) patch.hashtags = rest.hashtags
    const updated = await updateSocialTemplateQuery(id, patch)
    if (!updated) throw new ActionError("Template not found.")
    revalidatePath("/dashboard/marketing")
    return { id: updated.id }
  })

export const deleteSocialTemplateAction = authedAction
  .metadata({ actionName: "marketing.deleteSocialTemplate" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput }) => {
    const ok = await deleteSocialTemplateQuery(parsedInput.id)
    if (!ok) throw new ActionError("Template not found.")
    revalidatePath("/dashboard/marketing")
    return { ok: true }
  })

// Export support is purely client-side (Canvas → PNG), but we expose an action
// so the UI can log the export event symmetrically with the other marketing
// actions. Nothing server-side needs to happen beyond acknowledgement.
export const logSocialExportAction = authedAction
  .metadata({ actionName: "marketing.logSocialExport" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput }) => {
    const professional = await getProfessional()
    if (!professional) throw new ActionError("Unauthorized")
    return { ok: true, templateId: parsedInput.id }
  })

// ─────────────────────────────────────────────────────────────────────────────
// Lead magnets
// ─────────────────────────────────────────────────────────────────────────────

const prepareLeadMagnetUploadSchema = z.object({
  filename: z.string().min(1).max(300),
  fileSize: z.number().int().nonnegative().max(25 * 1024 * 1024),
  fileType: z.string().max(100).optional(),
})

const createLeadMagnetSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(2000).nullable().optional(),
  fileKey: z.string().min(1).max(500),
  fileName: z.string().min(1).max(300),
  fileSize: z.number().int().nonnegative(),
  isPublished: z.boolean().default(true),
})

const updateLeadMagnetSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(160).optional(),
  description: z.string().max(2000).nullable().optional(),
  isPublished: z.boolean().optional(),
})

const requestLeadMagnetSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(48)
    .regex(/^[a-z0-9-]+$/),
  leadMagnetId: z.string().uuid(),
  fullName: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(40).optional().or(z.literal("")),
  // Honeypot — see micro-sites contact-form for pattern.
  website: z.string().max(400).optional().or(z.literal("")),
})

function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[\\/]/g, "_")
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
  return cleaned.slice(0, 200) || "untitled"
}

export const prepareLeadMagnetUploadAction = authedAction
  .metadata({ actionName: "marketing.prepareLeadMagnet" })
  .inputSchema(prepareLeadMagnetUploadSchema)
  .action(async ({ parsedInput }) => {
    const professional = await getProfessional()
    if (!professional) throw new ActionError("Complete onboarding first.")
    const limits = resolvePlanLimits(professional.planLimits, professional.plan)
    if (!limits.features?.includes("marketing_kit")) {
      throw new ActionError("Your plan doesn't include lead magnets.")
    }
    const key = `${professional.id}/lead-magnets/${crypto.randomUUID()}-${sanitizeFilename(parsedInput.filename)}`
    return { storageKey: key, bucket: MARKETING_BUCKET }
  })

export const createLeadMagnetAction = authedAction
  .metadata({ actionName: "marketing.createLeadMagnet" })
  .inputSchema(createLeadMagnetSchema)
  .action(async ({ parsedInput }) => {
    const professional = await getProfessional()
    if (!professional) throw new ActionError("Complete onboarding first.")

    if (!parsedInput.fileKey.startsWith(`${professional.id}/`)) {
      throw new ActionError("Invalid storage key.")
    }

    // Enforce per-plan cap — prevents one account from stashing hundreds of
    // gated files into the public bucket.
    const existing = await dbAdmin
      .select({ id: leadMagnets.id })
      .from(leadMagnets)
      .where(eq(leadMagnets.professionalId, professional.id))
    const cap = maxLeadMagnetsForPlan(professional.plan)
    if (existing.length >= cap) {
      throw new ActionError(
        `Your plan allows up to ${cap} lead magnet${cap === 1 ? "" : "s"}.`,
      )
    }

    const created = await createLeadMagnetQuery({
      title: parsedInput.title,
      description: parsedInput.description ?? null,
      fileKey: parsedInput.fileKey,
      fileName: parsedInput.fileName,
      fileSize: parsedInput.fileSize,
      isPublished: parsedInput.isPublished,
    })

    revalidatePath("/dashboard/marketing")
    return { id: created.id }
  })

export const updateLeadMagnetAction = authedAction
  .metadata({ actionName: "marketing.updateLeadMagnet" })
  .inputSchema(updateLeadMagnetSchema)
  .action(async ({ parsedInput }) => {
    const { id, ...rest } = parsedInput
    const patch: Record<string, unknown> = {}
    if (rest.title !== undefined) patch.title = rest.title
    if (rest.description !== undefined) patch.description = rest.description
    if (rest.isPublished !== undefined) patch.isPublished = rest.isPublished
    const updated = await updateLeadMagnetQuery(id, patch)
    if (!updated) throw new ActionError("Lead magnet not found.")
    revalidatePath("/dashboard/marketing")
    return { id: updated.id }
  })

export const deleteLeadMagnetAction = authedAction
  .metadata({ actionName: "marketing.deleteLeadMagnet" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput }) => {
    const professional = await getProfessional()
    if (!professional) throw new ActionError("Unauthorized")
    const [row] = await dbAdmin
      .select({ fileKey: leadMagnets.fileKey })
      .from(leadMagnets)
      .where(
        and(
          eq(leadMagnets.id, parsedInput.id),
          eq(leadMagnets.professionalId, professional.id),
        ),
      )
      .limit(1)
    if (!row) throw new ActionError("Lead magnet not found.")

    // Best-effort storage cleanup — we don't want a stale file behind if the
    // row goes away.
    try {
      await getSupabaseAdmin().storage.from(MARKETING_BUCKET).remove([row.fileKey])
    } catch (err) {
      captureException(err, { tags: { action: "marketing.deleteLeadMagnet" } })
    }

    const ok = await deleteLeadMagnetQuery(parsedInput.id)
    if (!ok) throw new ActionError("Couldn't delete lead magnet.")
    revalidatePath("/dashboard/marketing")
    return { ok: true }
  })

// Public action — the micro-site's lead-magnet form posts here. We create a
// lead in the pro's pipeline and return a short-lived signed URL. The file
// itself lives in the public `marketing` bucket, but we keep the signed URL
// because (a) we want the download to count in the same flow, and (b) it gives
// us a thin layer of rate-limiting via the URL expiry.
export const requestLeadMagnetAction = publicAction
  .metadata({ actionName: "marketing.requestLeadMagnet" })
  .inputSchema(requestLeadMagnetSchema)
  .action(async ({ parsedInput }) => {
    // Honeypot short-circuit — mirrors submitContactFormAction.
    if (parsedInput.website && parsedInput.website.trim().length > 0) {
      return { ok: true, url: null }
    }

    if (publicFormRateLimit) {
      const { success } = await publicFormRateLimit.limit(
        `magnet:${parsedInput.slug}:${parsedInput.email}`,
      )
      if (!success) {
        throw new ActionError(
          "You're downloading too quickly — try again in a minute.",
        )
      }
    }

    const resolved = await getProfessionalIdForPublishedSlug(parsedInput.slug)
    if (!resolved) throw new ActionError("This site isn't live right now.")

    const magnet = await getPublishedLeadMagnet(parsedInput.leadMagnetId)
    if (!magnet || magnet.professionalId !== resolved.professionalId) {
      throw new ActionError("That download isn't available.")
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
      throw new ActionError(
        "The professional hasn't set up their pipeline yet — try again later.",
      )
    }

    const [lead] = await dbAdmin
      .insert(leads)
      .values({
        professionalId: resolved.professionalId,
        stageId: firstStage.id,
        fullName: parsedInput.fullName,
        email: parsedInput.email,
        phone: parsedInput.phone || null,
        source: "lead-magnet",
        notes: `Downloaded "${magnet.title}"`,
        metadata: {
          slug: parsedInput.slug,
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
      email: parsedInput.email,
      fullName: parsedInput.fullName,
      phone: parsedInput.phone || null,
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
      captureException(err, { tags: { action: "marketing.requestLeadMagnet" } })
    }
    if (!url) {
      const admin = getSupabaseAdmin()
      const { data } = admin.storage
        .from(MARKETING_BUCKET)
        .getPublicUrl(magnet.fileKey)
      url = data.publicUrl
    }

    revalidatePath("/dashboard/leads")
    revalidatePath("/dashboard/marketing")
    return { ok: true, url }
  })
