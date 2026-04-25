import "server-only"

import {
  getMessages as getMessagesQuery,
  getOrCreateConversation as getOrCreateConversationQuery,
} from "@/lib/db/queries/messages"
import { getProfessional } from "@/lib/db/queries/professionals"

import type { ServiceContext } from "../_lib/context"
import { UnauthorizedError } from "../_lib/errors"

export type OpenClientConversationInput = { clientId: string }
export type OpenClientConversationResult = {
  conversationId: string
  messages: Array<{
    id: string
    conversationId: string
    senderId: string
    senderRole: string
    content: string | null
    type: string
    mediaUrl: string | null
    readAt: string | null
    createdAt: string
  }>
}

export async function openClientConversation(
  _ctx: ServiceContext,
  input: OpenClientConversationInput,
): Promise<OpenClientConversationResult> {
  const professional = await getProfessional()
  if (!professional) throw new UnauthorizedError()
  const conversation = await getOrCreateConversationQuery(input.clientId)
  const messages = await getMessagesQuery(conversation.id)
  return {
    conversationId: conversation.id,
    messages: messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      senderRole: m.senderRole,
      content: m.content,
      type: m.type,
      mediaUrl: m.mediaUrl,
      readAt: m.readAt ? m.readAt.toISOString() : null,
      createdAt: m.createdAt.toISOString(),
    })),
  }
}
