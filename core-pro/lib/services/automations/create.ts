import "server-only"

import { createAutomation as createAutomationQuery } from "@/lib/db/queries/automations"
import { getProfessional } from "@/lib/db/queries/professionals"
import { trackServerEvent } from "@/lib/posthog/events"
import type {
  AutomationAction,
  TriggerConfig,
  TriggerType,
} from "@/lib/automations/types"

import type { ServiceContext } from "../_lib/context"

export type CreateAutomationInput = {
  name: string
  triggerType: TriggerType
  triggerConfig: TriggerConfig
  actions: AutomationAction[]
  isActive?: boolean
}

export type CreateAutomationResult = { id: string }

export async function createAutomation(
  _ctx: ServiceContext,
  input: CreateAutomationInput,
): Promise<CreateAutomationResult> {
  const row = await createAutomationQuery({
    name: input.name,
    triggerType: input.triggerType,
    triggerConfig: input.triggerConfig,
    actions: input.actions,
    isActive: input.isActive,
  })

  const professional = await getProfessional()
  if (professional) {
    void trackServerEvent("automation_created", {
      distinctId: professional.clerkUserId,
      professionalId: professional.id,
      plan: professional.plan,
      automationId: row.id,
      triggerType: input.triggerType,
    })
  }

  return { id: row.id }
}
