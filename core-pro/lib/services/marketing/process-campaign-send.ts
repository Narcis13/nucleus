import "server-only"

import { and, eq, sql } from "drizzle-orm"

import { logError } from "@/lib/audit/log"
import { dbAdmin } from "@/lib/db/client"
import {
  finalizeCampaignSend,
  markRecipientSent,
} from "@/lib/db/queries/marketing"
import {
  emailCampaignRecipients,
  emailCampaigns,
  professionals,
} from "@/lib/db/schema"
import { env } from "@/lib/env"
import { expandMergeTags, type MergeTagContext } from "@/lib/marketing/templates"
import { trackServerEvent } from "@/lib/posthog/events"
import { fromAddress, getResend } from "@/lib/resend/client"

export type ProcessCampaignSendResult = { delivered: number; total: number }

// Drains queued recipients for a campaign and dispatches via Resend. Idempotent:
// only operates on rows still `status='queued'`, so retries pick up where a
// previous attempt left off. Runs without a Clerk session (called from the
// Trigger.dev task), so all DB access is via `dbAdmin`.
export async function processCampaignSend(
  campaignId: string,
): Promise<ProcessCampaignSendResult> {
  const [campaign] = await dbAdmin
    .select()
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, campaignId))
    .limit(1)
  if (!campaign) {
    return { delivered: 0, total: 0 }
  }

  const [professional] = await dbAdmin
    .select()
    .from(professionals)
    .where(eq(professionals.id, campaign.professionalId))
    .limit(1)
  if (!professional) {
    await finalizeCampaignSend(campaignId, campaign.sentCount ?? 0)
    return { delivered: 0, total: 0 }
  }

  const queued = await dbAdmin
    .select()
    .from(emailCampaignRecipients)
    .where(
      and(
        eq(emailCampaignRecipients.campaignId, campaignId),
        eq(emailCampaignRecipients.status, "queued"),
      ),
    )

  const resend = getResend()
  if (!resend) {
    // Mark every queued recipient with a clear error rather than leaving them
    // hanging — admin must add RESEND_API_KEY before retrying.
    for (const row of queued) {
      await markRecipientSent({
        id: row.id,
        error: "Email delivery isn't configured (missing RESEND_API_KEY).",
      })
    }
    const sentCount = await countSentRecipients(campaignId)
    await finalizeCampaignSend(campaignId, sentCount)
    return { delivered: 0, total: queued.length }
  }

  const from = fromAddress()
  const ctxBase: MergeTagContext = {
    professional_name: professional.fullName,
    portal_url: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/portal`,
    booking_url: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/portal/calendar`,
    site_url: env.NEXT_PUBLIC_APP_URL,
  }

  let delivered = 0
  for (const row of queued) {
    const subject = expandMergeTags(campaign.subject, {
      ...ctxBase,
      client_name: row.fullName,
    })
    const html = expandMergeTags(campaign.bodyHtml, {
      ...ctxBase,
      client_name: row.fullName,
    })

    try {
      const { data, error } = await resend.emails.send({
        from,
        to: [row.email],
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
      // Flush counter every 25 sends so the UI progresses on long runs.
      if (delivered % 25 === 0) {
        await dbAdmin
          .update(emailCampaigns)
          .set({ sentCount: sql`${emailCampaigns.sentCount} + 25` })
          .where(eq(emailCampaigns.id, campaign.id))
      }
    } catch (err) {
      logError(err, {
        source: "service:marketing.processCampaignSend",
        professionalId: professional.id,
        metadata: { campaignId, recipientId: row.id },
      })
      await markRecipientSent({
        id: row.id,
        error: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  const finalSent = await countSentRecipients(campaignId)
  await finalizeCampaignSend(campaignId, finalSent)

  void trackServerEvent("email_campaign_sent", {
    distinctId: professional.clerkUserId,
    professionalId: professional.id,
    plan: professional.plan,
    campaignId,
    delivered,
    total: queued.length,
  })

  return { delivered, total: queued.length }
}

async function countSentRecipients(campaignId: string): Promise<number> {
  const rows = await dbAdmin
    .select({ count: sql<number>`count(*)::int` })
    .from(emailCampaignRecipients)
    .where(
      and(
        eq(emailCampaignRecipients.campaignId, campaignId),
        eq(emailCampaignRecipients.status, "sent"),
      ),
    )
  return rows[0]?.count ?? 0
}
