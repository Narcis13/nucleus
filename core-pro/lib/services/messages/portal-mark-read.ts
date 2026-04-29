import "server-only"

import { markPortalMessagesRead } from "@/lib/db/queries/portal"

import type { PortalActionCtx } from "@/lib/actions/safe-action"

export type PortalMarkMessagesAsReadInput = { conversationId: string }
export type PortalMarkMessagesAsReadResult = { count: number }

// Mark every inbound (professional → client) message in the given
// conversation as read for the calling portal session. Idempotent. Output
// shape matches `markMessagesAsRead` on the agent path so the shared
// `MessageThread` component can accept either action.
export async function portalMarkMessagesAsRead(
  ctx: PortalActionCtx,
  input: PortalMarkMessagesAsReadInput,
): Promise<PortalMarkMessagesAsReadResult> {
  const flipped = await markPortalMessagesRead({
    conversationId: input.conversationId,
    clientId: ctx.clientId,
  })
  return { count: flipped.length }
}
