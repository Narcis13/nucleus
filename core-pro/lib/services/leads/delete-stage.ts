import "server-only"

import {
  deleteStage as deleteStageQuery,
  getStages,
} from "@/lib/db/queries/leads"

import type { ServiceContext } from "../_lib/context"
import { ServiceError } from "../_lib/errors"

export type DeleteStageInput = { id: string }

export type DeleteStageResult = { id: string }

export async function deleteStage(
  _ctx: ServiceContext,
  input: DeleteStageInput,
): Promise<DeleteStageResult> {
  const stages = await getStages()
  if (stages.length <= 1) {
    throw new ServiceError("Keep at least one stage.")
  }
  const result = await deleteStageQuery(input.id)
  if (!result.deleted) {
    throw new ServiceError(result.reason ?? "Couldn't delete stage.")
  }
  return { id: input.id }
}
