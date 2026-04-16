import "server-only"

import { and, desc, eq, isNull, sql } from "drizzle-orm"

import { withRLS } from "@/lib/db/rls"
import { clients, conversations, messages } from "@/lib/db/schema"
import type { Message } from "@/types/domain"

import { getProfessional } from "./professionals"

// Conversation list for the current professional, with the linked client and
// a derived unread count (messages from the client that the pro hasn't read).
export async function getConversations() {
  return withRLS(async (tx) => {
    return tx
      .select({
        conversation: conversations,
        client: {
          id: clients.id,
          fullName: clients.fullName,
          avatarUrl: clients.avatarUrl,
        },
        unreadCount: sql<number>`(
          select count(*)::int from ${messages} m
          where m.conversation_id = ${conversations.id}
            and m.sender_role = 'client'
            and m.read_at is null
        )`,
      })
      .from(conversations)
      .innerJoin(clients, eq(clients.id, conversations.clientId))
      .orderBy(desc(conversations.lastMessageAt))
  })
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  return withRLS(async (tx) => {
    return tx
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
  })
}

// Inserts a message + bumps `last_message_at` on the parent conversation so
// the conversation list ordering stays correct without a separate update path.
export async function sendMessage(args: {
  conversationId: string
  senderId: string
  senderRole: "professional" | "client"
  content?: string
  type?: string
  mediaUrl?: string
}): Promise<Message> {
  return withRLS(async (tx) => {
    const [created] = await tx
      .insert(messages)
      .values({
        conversationId: args.conversationId,
        senderId: args.senderId,
        senderRole: args.senderRole,
        content: args.content,
        type: args.type ?? "text",
        mediaUrl: args.mediaUrl,
      })
      .returning()
    if (!created) throw new Error("Failed to insert message")
    await tx
      .update(conversations)
      .set({ lastMessageAt: created.createdAt })
      .where(eq(conversations.id, args.conversationId))
    return created
  })
}

// Idempotent get-or-create — useful when opening a conversation from a
// client profile where it may not exist yet.
export async function getOrCreateConversation(clientId: string) {
  const professional = await getProfessional()
  if (!professional) throw new Error("No professional context")
  return withRLS(async (tx) => {
    const [existing] = await tx
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.professionalId, professional.id),
          eq(conversations.clientId, clientId),
        ),
      )
      .limit(1)
    if (existing) return existing
    const [created] = await tx
      .insert(conversations)
      .values({
        professionalId: professional.id,
        clientId,
      })
      .returning()
    if (!created) throw new Error("Failed to create conversation")
    return created
  })
}

export async function markMessagesRead(
  conversationId: string,
  asRole: "professional" | "client",
) {
  return withRLS(async (tx) => {
    return tx
      .update(messages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          // Only mark messages from the *other* side as read.
          eq(
            messages.senderRole,
            asRole === "professional" ? "client" : "professional",
          ),
          isNull(messages.readAt),
        ),
      )
      .returning({ id: messages.id })
  })
}
