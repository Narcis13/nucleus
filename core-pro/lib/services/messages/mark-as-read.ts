import "server-only"

import { markMessagesRead } from "@/lib/db/queries/messages"

import type { ServiceContext } from "../_lib/context"
import { UnauthorizedError } from "../_lib/errors"
import { resolveSender } from "./_sender"

export type MarkMessagesAsReadInput = { conversationId: string }
export type MarkMessagesAsReadResult = { count: number }

export async function markMessagesAsRead(
  ctx: ServiceContext,
  input: MarkMessagesAsReadInput,
): Promise<MarkMessagesAsReadResult> {
  const sender = await resolveSender(ctx.userId)
  if (!sender) throw new UnauthorizedError()
  const result = await markMessagesRead(input.conversationId, sender.role)
  return { count: result.length }
}
