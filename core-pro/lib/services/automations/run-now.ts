import "server-only"

import { processAutomationChain } from "@/lib/automations/engine"
import { getAutomation } from "@/lib/db/queries/automations"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError } from "../_lib/errors"

export type RunAutomationNowInput = {
  id: string
  targetId?: string | null
}

export type RunAutomationNowResult = { ok: true }

export async function runAutomationNow(
  _ctx: ServiceContext,
  input: RunAutomationNowInput,
): Promise<RunAutomationNowResult> {
  const row = await getAutomation(input.id)
  if (!row) throw new NotFoundError("Automation not found.")
  await processAutomationChain(row.id, input.targetId ?? null)
  return { ok: true }
}
