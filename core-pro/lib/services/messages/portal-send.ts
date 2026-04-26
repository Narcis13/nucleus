import "server-only"

import { sendPortalMessage } from "@/lib/db/queries/portal"
import { trackServerEvent } from "@/lib/posthog/events"

import { NotFoundError } from "../_lib/errors"
import type { PortalActionCtx } from "@/lib/actions/safe-action"

export type PortalSendMessageInput = {
  conversationId: string
  content?: string
  type: "text" | "image" | "file"
  mediaUrl?: string
}

export type PortalSendMessageResult = {
  id: string
  conversationId: string
  senderId: string
  senderRole: string
  content: string | null
  type: string
  mediaUrl: string | null
  readAt: string | null
  createdAt: string
}

// Counterpart to `sendMessage` for the portal. Sender is fixed to the
// session's client — no Clerk lookup, no role resolution.
export async function portalSendMessage(
  ctx: PortalActionCtx,
  input: PortalSendMessageInput,
): Promise<PortalSendMessageResult> {
  const created = await sendPortalMessage({
    conversationId: input.conversationId,
    clientId: ctx.clientId,
    content: input.content?.trim() || null,
    type: input.type,
    mediaUrl: input.mediaUrl ?? null,
  })
  if (!created) {
    throw new NotFoundError("Conversation not found.")
  }

  void trackServerEvent("message_sent", {
    distinctId: `client_${ctx.clientId}`,
    conversationId: input.conversationId,
    senderRole: "client",
    messageType: input.type,
  }).catch(() => {})

  return {
    id: created.id,
    conversationId: created.conversationId,
    senderId: created.senderId,
    senderRole: created.senderRole,
    content: created.content,
    type: created.type,
    mediaUrl: created.mediaUrl,
    readAt: created.readAt ? created.readAt.toISOString() : null,
    createdAt: created.createdAt.toISOString(),
  }
}
