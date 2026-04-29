import "server-only"

import { updateAutomation as updateAutomationQuery } from "@/lib/db/queries/automations"
import type {
  AutomationAction,
  TriggerConfig,
  TriggerType,
} from "@/lib/automations/types"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError } from "../_lib/errors"

export type UpdateAutomationInput = {
  id: string
  name?: string
  triggerType?: TriggerType
  triggerConfig?: TriggerConfig
  actions?: AutomationAction[]
  isActive?: boolean
}

export type UpdateAutomationResult = { id: string }

export async function updateAutomation(
  _ctx: ServiceContext,
  input: UpdateAutomationInput,
): Promise<UpdateAutomationResult> {
  const { id, ...rest } = input
  const patch: Record<string, unknown> = {}
  if (rest.name !== undefined) patch.name = rest.name
  if (rest.triggerType !== undefined) patch.triggerType = rest.triggerType
  if (rest.triggerConfig !== undefined) patch.triggerConfig = rest.triggerConfig
  if (rest.actions !== undefined) patch.actions = rest.actions
  if (rest.isActive !== undefined) patch.isActive = rest.isActive
  const row = await updateAutomationQuery(id, patch)
  if (!row) throw new NotFoundError("Automation not found.")
  return { id: row.id }
}
