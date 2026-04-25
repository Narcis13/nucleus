import "server-only"

import { inviteClient as clerkInviteClient } from "@/lib/clerk/helpers"
import { evaluateTrigger } from "@/lib/automations/engine"
import {
  countActiveClients,
  createClient as createClientQuery,
} from "@/lib/db/queries/clients"
import { getProfessional } from "@/lib/db/queries/professionals"
import { trackServerEvent } from "@/lib/posthog/events"
import { getPlan, planLimitsFor } from "@/lib/stripe/plans"
import type { PlanLimits } from "@/types/domain"

import type { ServiceContext } from "../_lib/context"
import { PlanLimitError, UnauthorizedError } from "../_lib/errors"

function resolvePlanLimits(
  planLimits: unknown,
  planId: string | null | undefined,
): PlanLimits {
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

  let invited = false
  if (input.invite && professional.clerkOrgId) {
    try {
      await clerkInviteClient({
        email: input.email,
        professionalId: professional.id,
        clerkOrgId: professional.clerkOrgId,
        inviterUserId: professional.clerkUserId,
      })
      invited = true
    } catch {
      // Swallow; surfaced via `invited: false` in the response.
    }
  }

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
    invited,
    source: input.source || null,
  })

  return { id: created.id, invited }
}
