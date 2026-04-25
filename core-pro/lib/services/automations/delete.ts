import "server-only"

import { deleteAutomation as deleteAutomationQuery } from "@/lib/db/queries/automations"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError } from "../_lib/errors"

export type DeleteAutomationInput = { id: string }

export type DeleteAutomationResult = { ok: true }

export async function deleteAutomation(
  _ctx: ServiceContext,
  input: DeleteAutomationInput,
): Promise<DeleteAutomationResult> {
  const ok = await deleteAutomationQuery(input.id)
  if (!ok) throw new NotFoundError("Automation not found.")
  return { ok: true }
}
