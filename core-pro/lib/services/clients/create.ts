import "server-only"

import { evaluateTrigger } from "@/lib/automations/engine"
import {
  countActiveClients,
  createClient as createClientQuery,
} from "@/lib/db/queries/clients"
import { getProfessional } from "@/lib/db/queries/professionals"
import { trackServerEvent } from "@/lib/posthog/events"
import { FEATURE_GATING_ENABLED, getPlan, planLimitsFor } from "@/lib/stripe/plans"
import type { PlanLimits } from "@/types/domain"

import type { ServiceContext } from "../_lib/context"
import { PlanLimitError, UnauthorizedError } from "../_lib/errors"

function resolvePlanLimits(
  planLimits: unknown,
  planId: string | null | undefined,
): PlanLimits {
  if (!FEATURE_GATING_ENABLED) return planLimitsFor(getPlan(planId))
  if (planLimits && typeof planLimits === "object") {
    return planLimits as PlanLimits
  }
  return planLimitsFor(getPlan(planId))
}

export type CreateClientInput = {
  fullName: string
  email: string
  phone?: string | ""
  dateOfBirth?: string | ""
  locale?: string
  source?: string | ""
  invite: boolean
}

// `invited` is always false now — auto-invite at create time was the old
// Clerk-org-invitation flow. The agent invites separately via
// `inviteClientToPortalAction` after creation. The field stays in the result
// shape for callers/UI; flip to `false` and let them re-prompt as needed.
export type CreateClientResult = { id: string; invited: boolean }

export async function createClient(
  _ctx: ServiceContext,
  input: CreateClientInput,
): Promise<CreateClientResult> {
  const professional = await getProfessional()
  if (!professional) {
    throw new UnauthorizedError("Complete onboarding before adding clients.")
  }

  const limits = resolvePlanLimits(professional.planLimits, professional.plan)
  const active = await countActiveClients()
  if (active >= limits.max_clients) {
    throw new PlanLimitError(
      `Your ${professional.plan} plan allows up to ${limits.max_clients} active clients. Upgrade to add more.`,
    )
  }

  const created = await createClientQuery(
    {
      email: input.email,
      fullName: input.fullName,
      phone: input.phone || null,
      dateOfBirth: input.dateOfBirth || null,
      locale: input.locale ?? "ro",
    },
    { source: input.source || undefined },
  )

  void evaluateTrigger("new_client", {
    type: "new_client",
    professionalId: professional.id,
    clientId: created.id,
  }).catch(() => {})

  void trackServerEvent("client_added", {
    distinctId: professional.clerkUserId,
    professionalId: professional.id,
    plan: professional.plan,
    clientId: created.id,
    invited: false,
    source: input.source || null,
  })

  return { id: created.id, invited: false }
}
