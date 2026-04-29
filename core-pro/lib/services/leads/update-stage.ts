import "server-only"

import { updateStage as updateStageQuery } from "@/lib/db/queries/leads"
import type { LeadStage } from "@/types/domain"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError } from "../_lib/errors"

export type UpdateStageInput = {
  id: string
  name?: string
  color?: string
  isWon?: boolean
  isLost?: boolean
}

export type UpdateStageResult = { stage: LeadStage }

export async function updateStage(
  _ctx: ServiceContext,
  input: UpdateStageInput,
): Promise<UpdateStageResult> {
  const { id, ...rest } = input
  const updated = await updateStageQuery(id, rest)
  if (!updated) throw new NotFoundError("Stage not found.")
  return { stage: updated }
}
