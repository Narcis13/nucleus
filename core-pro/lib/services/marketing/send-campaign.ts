import "server-only"

import {
  getEmailCampaign,
  insertRecipients,
  resolveAudience,
  updateEmailCampaign as updateEmailCampaignQuery,
} from "@/lib/db/queries/marketing"
import { getProfessional } from "@/lib/db/queries/professionals"
import { env } from "@/lib/env"
import { getResend } from "@/lib/resend/client"
import type { EmailCampaignAudience } from "@/types/domain"

import type { ServiceContext } from "../_lib/context"
import {
  NotFoundError,
  PlanLimitError,
  ServiceError,
  UnauthorizedError,
} from "../_lib/errors"
import { maxRecipientsForPlan, resolvePlanLimits } from "./_lib"
import { processCampaignSend } from "./process-campaign-send"

export type SendCampaignInput = { id: string }
export type SendCampaignResult = { enqueued: number; total: number }

// Validates the send, pre-inserts a queued recipient row per audience member,
// flips the campaign to "sending", and hands off to a Trigger.dev task. The
// task drains the queued rows via `processCampaignSend` and finalizes the
// campaign — the request returns immediately so a 1k-recipient send doesn't
// block the action handler past the platform timeout.
//
// Falls back to inline send when `TRIGGER_SECRET_KEY` isn't configured (local
// dev without trigger.dev running) so behavior matches a fresh checkout.
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
  if (campaign.status === "sending") {
    throw new ServiceError("This campaign is already being sent.")
  }

  // Resend availability is checked here so a misconfigured workspace fails
  // synchronously with a clear error instead of silently queuing rows that
  // the worker would later mark as errored.
  if (!getResend()) {
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

  const rows = recipients.map((r) => ({
    campaignId: campaign.id,
    email: r.email,
    fullName: r.fullName,
    clientId: r.clientId,
    status: "queued" as const,
  }))
  await insertRecipients(rows)
  await updateEmailCampaignQuery(campaign.id, { status: "sending" })

  if (!env.TRIGGER_SECRET_KEY) {
    // No background worker available — drain inline so dev environments
    // without trigger.dev still finish the send.
    const result = await processCampaignSend(campaign.id)
    return { enqueued: result.delivered, total: result.total }
  }

  const { tasks } = await import("@trigger.dev/sdk")
  await tasks.trigger("marketing.send-campaign", { campaignId: campaign.id })

  return { enqueued: recipients.length, total: recipients.length }
}
