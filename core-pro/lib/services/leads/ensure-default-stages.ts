import "server-only"

import { ensureDefaultStages as ensureDefaultStagesQuery } from "@/lib/db/queries/leads"

import type { ServiceContext } from "../_lib/context"

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type EnsureDefaultStagesInput = {}

export type EnsureDefaultStagesResult = { count: number }

export async function ensureDefaultStages(
  _ctx: ServiceContext,
  _input: EnsureDefaultStagesInput,
): Promise<EnsureDefaultStagesResult> {
  const stages = await ensureDefaultStagesQuery()
  return { count: stages.length }
}
