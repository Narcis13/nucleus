import "server-only"

import { sendMessage as sendMessageQuery } from "@/lib/db/queries/messages"
import { trackServerEvent } from "@/lib/posthog/events"

import type { ServiceContext } from "../_lib/context"
import { UnauthorizedError } from "../_lib/errors"
import { resolveSender } from "./_sender"

export type SendMessageInput = {
  conversationId: string
  content?: string
  type: "text" | "image" | "file"
  mediaUrl?: string
}

export type SendMessageResult = {
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

export async function sendMessage(
  ctx: ServiceContext,
  input: SendMessageInput,
): Promise<SendMessageResult> {
  const sender = await resolveSender(ctx.userId)
  if (!sender) throw new UnauthorizedError()

  const created = await sendMessageQuery({
    conversationId: input.conversationId,
    senderId: sender.id,
    senderRole: sender.role,
    content: input.content?.trim() || undefined,
    type: input.type,
    mediaUrl: input.mediaUrl,
  })

  void trackServerEvent("message_sent", {
    distinctId: ctx.userId,
    conversationId: input.conversationId,
    senderRole: sender.role,
    messageType: input.type,
  })

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
