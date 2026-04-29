import "server-only"

import { reorderStages as reorderStagesQuery } from "@/lib/db/queries/leads"

import type { ServiceContext } from "../_lib/context"

export type ReorderStagesInput = {
  ordered: Array<{ id: string; position: number }>
}

export type ReorderStagesResult = { ok: true }

export async function reorderStages(
  _ctx: ServiceContext,
  input: ReorderStagesInput,
): Promise<ReorderStagesResult> {
  await reorderStagesQuery(input.ordered)
  return { ok: true }
}
