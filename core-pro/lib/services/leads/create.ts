import "server-only"

import { evaluateTrigger } from "@/lib/automations/engine"
import {
  createLead as createLeadQuery,
  ensureDefaultStages,
} from "@/lib/db/queries/leads"
import { getProfessional } from "@/lib/db/queries/professionals"
import { trackServerEvent } from "@/lib/posthog/events"
import type { Lead } from "@/types/domain"

import type { ServiceContext } from "../_lib/context"
import { ServiceError, UnauthorizedError } from "../_lib/errors"

export type CreateLeadInput = {
  fullName: string
  email?: string
  phone?: string
  source?: string
  stageId?: string
}

export type CreateLeadResult = { lead: Lead }

export async function createLead(
  _ctx: ServiceContext,
  input: CreateLeadInput,
): Promise<CreateLeadResult> {
  const professional = await getProfessional()
  if (!professional) {
    throw new UnauthorizedError("Complete onboarding before adding leads.")
  }

  // The board page seeds defaults on first load, but if a lead is created
  // through some other surface we still need a stage to land on.
  const stages = await ensureDefaultStages()
  const stageId = input.stageId ?? stages[0]?.id
  if (!stageId) {
    throw new ServiceError("No pipeline stages available.")
  }

  const created = await createLeadQuery({
    professionalId: professional.id,
    stageId,
    fullName: input.fullName,
    email: input.email || null,
    phone: input.phone || null,
    source: input.source || null,
  })

  // Fire automations keyed on `new_lead` — best-effort, never blocks the
  // authoring response if Trigger.dev / the engine chokes.
  void evaluateTrigger("new_lead", {
    type: "new_lead",
    professionalId: professional.id,
    leadId: created.id,
  }).catch(() => {})

  void trackServerEvent("lead_created", {
    distinctId: professional.clerkUserId,
    professionalId: professional.id,
    plan: professional.plan,
    leadId: created.id,
    source: input.source || null,
  })

  return { lead: created }
}
