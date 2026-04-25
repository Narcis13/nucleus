import "server-only"

import {
  deleteEmailCampaign as deleteEmailCampaignQuery,
  getEmailCampaign,
} from "@/lib/db/queries/marketing"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError, ServiceError } from "../_lib/errors"

export type DeleteEmailCampaignInput = { id: string }
export type DeleteEmailCampaignResult = { ok: true }

export async function deleteEmailCampaign(
  _ctx: ServiceContext,
  input: DeleteEmailCampaignInput,
): Promise<DeleteEmailCampaignResult> {
  const existing = await getEmailCampaign(input.id)
  if (!existing) throw new NotFoundError("Campaign not found.")
  const ok = await deleteEmailCampaignQuery(input.id)
  if (!ok) throw new ServiceError("Couldn't delete campaign.")
  return { ok: true }
}
