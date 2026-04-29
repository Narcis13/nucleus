import "server-only"

import { markLeadLost as markLeadLostQuery } from "@/lib/db/queries/leads"
import type { Lead } from "@/types/domain"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError } from "../_lib/errors"

export type MarkLeadLostInput = {
  leadId: string
  reason?: string
}

export type MarkLeadLostResult = { lead: Lead }

export async function markLeadLost(
  _ctx: ServiceContext,
  input: MarkLeadLostInput,
): Promise<MarkLeadLostResult> {
  const updated = await markLeadLostQuery(input.leadId, input.reason)
  if (!updated) throw new NotFoundError("Lead not found.")
  return { lead: updated }
}
