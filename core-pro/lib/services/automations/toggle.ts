import "server-only"

import { setAutomationActive } from "@/lib/db/queries/automations"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError } from "../_lib/errors"

export type ToggleAutomationInput = {
  id: string
  isActive: boolean
}

export type ToggleAutomationResult = { id: string; isActive: boolean }

export async function toggleAutomation(
  _ctx: ServiceContext,
  input: ToggleAutomationInput,
): Promise<ToggleAutomationResult> {
  const row = await setAutomationActive(input.id, input.isActive)
  if (!row) throw new NotFoundError("Automation not found.")
  return { id: row.id, isActive: row.isActive }
}
