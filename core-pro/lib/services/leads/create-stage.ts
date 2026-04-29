import "server-only"

import { createStage as createStageQuery } from "@/lib/db/queries/leads"
import type { LeadStage } from "@/types/domain"

import type { ServiceContext } from "../_lib/context"

export type CreateStageInput = {
  name: string
  color?: string
  isWon?: boolean
  isLost?: boolean
}

export type CreateStageResult = { stage: LeadStage }

export async function createStage(
  _ctx: ServiceContext,
  input: CreateStageInput,
): Promise<CreateStageResult> {
  const created = await createStageQuery({
    name: input.name,
    color: input.color,
    isWon: input.isWon ?? false,
    isLost: input.isLost ?? false,
  })
  return { stage: created }
}
