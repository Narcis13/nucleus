import "server-only"

import { dbAdmin } from "@/lib/db/client"
import {
  bumpCampaignSentCounter,
  finalizeCampaignSend,
  getEmailCampaign,
  insertRecipients,
  markRecipientSent,
  resolveAudience,
  updateEmailCampaign as updateEmailCampaignQuery,
} from "@/lib/db/queries/marketing"
import { getProfessional } from "@/lib/db/queries/professionals"
import { env } from "@/lib/env"
import { expandMergeTags, type MergeTagContext } from "@/lib/marketing/templates"
import { trackServerEvent } from "@/lib/posthog/events"
import { fromAddress, getResend } from "@/lib/resend/client"
import type { EmailCampaignAudience } from "@/types/domain"

import type { ServiceContext } from "../_lib/context"
import {
  NotFoundError,
  PlanLimitError,
  ServiceError,
  UnauthorizedError,
} from "../_lib/errors"
import { maxRecipientsForPlan, resolvePlanLimits } from "./_lib"

export type SendCampaignInput = { id: string }
export type SendCampaignResult = { delivered: number; total: number }

// Resolves the campaign's audience, substitutes merge tags per-recipient, and
// fires via Resend. Delivery is best-effort: per-recipient failures are logged
// and recorded on `email_campaign_recipients.error` — the overall send only
// fails on systemic errors (no API key, over plan limits).
export async function sendCampaign(
  _ctx: ServiceContext,
  input: SendCampaignInput,
): Promise<SendCampaignResult> {
  const professional = await getProfessional()
  if (!professional) throw new UnauthorizedError("Complete onboarding first.")
  const limits = resolvePlanLimits(professional.planLimits, professional.plan)
  if (!limits.features?.includes("marketing_kit")) {
    throw new PlanLimitError("Your plan doesn't include sending campaigns.")
  }

  const campaign = await getEmailCampaign(input.id)
  if (!campaign) throw new NotFoundError("Campaign not found.")
  if (campaign.status === "sent") {
    throw new ServiceError("This campaign has already been sent.")
  }

  const resend = getResend()
  if (!resend) {
    throw new ServiceError(
      "Email sending isn't configured. Add RESEND_API_KEY to your environment.",
    )
  }

  const audience = campaign.audience as EmailCampaignAudience
  const recipients = await resolveAudience(audience)
  if (recipients.length === 0) {
    throw new ServiceError(
      "That segment has no recipients yet — pick a different audience.",
    )
  }

  const maxRecipients = maxRecipientsForPlan(professional.plan)
  if (recipients.length > maxRecipients) {
    throw new PlanLimitError(
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
      console.error(err, { tags: { action: "marketing.sendCampaign" } })
      await markRecipientSent({
        id: row.id,
        error: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  await finalizeCampaignSend(campaign.id, delivered)

  void trackServerEvent("email_campaign_sent", {
    distinctId: professional.clerkUserId,
    professionalId: professional.id,
    plan: professional.plan,
    campaignId: campaign.id,
    delivered,
    total: recipients.length,
  })

  return { delivered, total: recipients.length }
}
