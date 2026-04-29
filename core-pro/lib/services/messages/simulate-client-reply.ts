import "server-only"

import { eq } from "drizzle-orm"

import { sendMessage as sendMessageQuery } from "@/lib/db/queries/messages"
import { getProfessional } from "@/lib/db/queries/professionals"
import { conversations } from "@/lib/db/schema"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError, UnauthorizedError } from "../_lib/errors"

export type SimulateClientReplyInput = {
  conversationId: string
  content: string
}

export type SimulateClientReplyResult = {
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

export async function simulateClientReply(
  ctx: ServiceContext,
  input: SimulateClientReplyInput,
): Promise<SimulateClientReplyResult> {
  const professional = await getProfessional()
  if (!professional) throw new UnauthorizedError()

  // Resolve the conversation's clientId via the RLS-scoped tx — this
  // doubles as authorization (the pro can only see their own threads).
  const [convo] = await ctx.db
    .select({ clientId: conversations.clientId })
    .from(conversations)
    .where(eq(conversations.id, input.conversationId))
    .limit(1)
  if (!convo) throw new NotFoundError("Conversation not found")

  const created = await sendMessageQuery({
    conversationId: input.conversationId,
    senderId: convo.clientId,
    senderRole: "client",
    content: input.content.trim(),
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
