import "server-only"

import {
  convertLeadToClient as convertLeadToClientQuery,
  getLead as getLeadQuery,
} from "@/lib/db/queries/leads"
import { getProfessional } from "@/lib/db/queries/professionals"
import { trackServerEvent } from "@/lib/posthog/events"
import type { Lead } from "@/types/domain"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError } from "../_lib/errors"

export type ConvertLeadToClientInput = { id: string }

export type ConvertLeadToClientResult = {
  clientId: string
  leadId: string
  lead: Lead | null
}

export async function convertLeadToClient(
  _ctx: ServiceContext,
  input: ConvertLeadToClientInput,
): Promise<ConvertLeadToClientResult> {
  const professional = await getProfessional()
  const result = await convertLeadToClientQuery(input.id)
  if (!result) throw new NotFoundError("Lead not found.")
  if (professional) {
    void trackServerEvent("lead_converted", {
      distinctId: professional.clerkUserId,
      professionalId: professional.id,
      plan: professional.plan,
      leadId: result.leadId,
      clientId: result.clientId,
    })
  }
  const updatedLead = await getLeadQuery(result.leadId)
  return { ...result, lead: updatedLead }
}
