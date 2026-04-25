import "server-only"

import {
  getEmailCampaign,
  updateEmailCampaign as updateEmailCampaignQuery,
} from "@/lib/db/queries/marketing"
import type { EmailCampaignAudience } from "@/types/domain"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError, ServiceError } from "../_lib/errors"

export type UpdateEmailCampaignInput = {
  id: string
  name?: string
  templateKey?: string
  subject?: string
  bodyHtml?: string
  audience?: EmailCampaignAudience
  scheduledAt?: string | null
}

export type UpdateEmailCampaignResult = { id: string }

export async function updateEmailCampaign(
  _ctx: ServiceContext,
  input: UpdateEmailCampaignInput,
): Promise<UpdateEmailCampaignResult> {
  const existing = await getEmailCampaign(input.id)
  if (!existing) throw new NotFoundError("Campaign not found.")
  if (existing.status === "sent") {
    throw new ServiceError("Sent campaigns can't be edited.")
  }

  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) patch.name = input.name
  if (input.templateKey !== undefined) patch.templateKey = input.templateKey
  if (input.subject !== undefined) patch.subject = input.subject
  if (input.bodyHtml !== undefined) patch.bodyHtml = input.bodyHtml
  if (input.audience !== undefined) patch.audience = input.audience
  if (input.scheduledAt !== undefined) {
    patch.scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null
    patch.status = input.scheduledAt ? "scheduled" : "draft"
  }

  const updated = await updateEmailCampaignQuery(input.id, patch)
  if (!updated) throw new ServiceError("Couldn't update campaign.")
  return { id: updated.id }
}
