import "server-only"

import { createEmailCampaign as createEmailCampaignQuery } from "@/lib/db/queries/marketing"
import { getProfessional } from "@/lib/db/queries/professionals"
import type { EmailCampaignAudience } from "@/types/domain"

import type { ServiceContext } from "../_lib/context"
import { PlanLimitError, UnauthorizedError } from "../_lib/errors"
import { resolvePlanLimits } from "./_lib"

export type CreateEmailCampaignInput = {
  name: string
  templateKey: string
  subject: string
  bodyHtml: string
  audience: EmailCampaignAudience
  scheduledAt?: string | null
}

export type CreateEmailCampaignResult = { id: string }

export async function createEmailCampaign(
  _ctx: ServiceContext,
  input: CreateEmailCampaignInput,
): Promise<CreateEmailCampaignResult> {
  const professional = await getProfessional()
  if (!professional) {
    throw new UnauthorizedError("Complete onboarding first.")
  }
  const limits = resolvePlanLimits(professional.planLimits, professional.plan)
  if (!limits.features?.includes("marketing_kit")) {
    throw new PlanLimitError("Your plan doesn't include the marketing kit yet.")
  }

  const campaign = await createEmailCampaignQuery({
    professionalId: professional.id,
    name: input.name,
    templateKey: input.templateKey,
    subject: input.subject,
    bodyHtml: input.bodyHtml,
    audience: input.audience,
    status: input.scheduledAt ? "scheduled" : "draft",
    scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
  })

  return { id: campaign.id }
}
