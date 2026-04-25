import "server-only"

import { moveLeadToStage as moveLeadToStageQuery } from "@/lib/db/queries/leads"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError } from "../_lib/errors"

export type MoveLeadToStageInput = {
  leadId: string
  stageId: string
}

export type MoveLeadToStageResult = { id: string; stageId: string }

export async function moveLeadToStage(
  _ctx: ServiceContext,
  input: MoveLeadToStageInput,
): Promise<MoveLeadToStageResult> {
  const updated = await moveLeadToStageQuery(input.leadId, input.stageId)
  if (!updated) throw new NotFoundError("Lead not found.")
  return { id: updated.id, stageId: updated.stageId }
}
