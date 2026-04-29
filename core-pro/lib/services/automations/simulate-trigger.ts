import "server-only"

import { eq } from "drizzle-orm"

import { evaluateTrigger } from "@/lib/automations/engine"
import type { TriggerType } from "@/lib/automations/types"
import { dbAdmin } from "@/lib/db/client"
import { professionals } from "@/lib/db/schema"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError } from "../_lib/errors"

export type SimulateTriggerInput = {
  type: TriggerType
  payload: Record<string, unknown>
}

export type SimulateTriggerResult = { matched: number; enqueued: number }

export async function simulateTrigger(
  ctx: ServiceContext,
  input: SimulateTriggerInput,
): Promise<SimulateTriggerResult> {
  // Resolve the calling user's professional id. ctx.userId is the Clerk
  // sub, not a row id — evaluateTrigger expects the latter.
  const [pro] = await dbAdmin
    .select({ id: professionals.id })
    .from(professionals)
    .where(eq(professionals.clerkUserId, ctx.userId))
    .limit(1)
  if (!pro) throw new NotFoundError("Professional not found.")

  // The payload includes the professionalId; we force it to the current
  // user to prevent cross-tenant simulation.
  const payload = {
    ...input.payload,
    type: input.type,
    professionalId: pro.id,
  } as { type: TriggerType; professionalId: string } & Record<string, unknown>

  // Narrow type for the engine — caller knows which shape matches.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return evaluateTrigger(input.type, payload as any)
}
