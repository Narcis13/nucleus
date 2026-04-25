import "server-only"

import { addLeadActivity as addLeadActivityQuery } from "@/lib/db/queries/leads"
import type { LeadActivity } from "@/types/domain"

import type { ServiceContext } from "../_lib/context"

export type AddLeadActivityInput = {
  leadId: string
  type: "note" | "call" | "email" | "meeting"
  description: string
}

export type AddLeadActivityResult = { activity: LeadActivity }

export async function addLeadActivity(
  _ctx: ServiceContext,
  input: AddLeadActivityInput,
): Promise<AddLeadActivityResult> {
  const activity = await addLeadActivityQuery({
    leadId: input.leadId,
    type: input.type,
    description: input.description,
  })
  return { activity }
}
