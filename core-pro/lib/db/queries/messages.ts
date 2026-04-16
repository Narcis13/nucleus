import "server-only"

import { auth } from "@clerk/nextjs/server"
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm"

import { withRLS } from "@/lib/db/rls"
import { clients, conversations, messages, professionals } from "@/lib/db/schema"
import type { Message } from "@/types/domain"

import { getProfessional } from "./professionals"

// Conversation list for the current professional, with the linked client,
// a short last-message preview, and a derived unread count (messages from the
// client that the pro hasn't read). Used to paint the dashboard's message
// sidebar in a single round-trip — no N+1 fetches per row.
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
        lastMessagePreview: sql<string | null>`(
          select coalesce(m.content, case m.type when 'image' then '📷 Photo' when 'file' then '📎 Attachment' else '' end)
          from ${messages} m
          where m.conversation_id = ${conversations.id}
          order by m.created_at desc
          limit 1
        )`,
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

// Ascending (oldest → newest) so the chat UI can render messages bottom-down
// without an extra reverse on every render.
export async function getMessages(conversationId: string): Promise<Message[]> {
  return withRLS(async (tx) => {
    return tx
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt))
  })
}

// Single conversation with the linked client (for the thread header).
export async function getConversation(conversationId: string) {
  return withRLS(async (tx) => {
    const rows = await tx
      .select({
        conversation: conversations,
        client: {
          id: clients.id,
          fullName: clients.fullName,
          avatarUrl: clients.avatarUrl,
          email: clients.email,
        },
      })
      .from(conversations)
      .innerJoin(clients, eq(clients.id, conversations.clientId))
      .where(eq(conversations.id, conversationId))
      .limit(1)
    return rows[0] ?? null
  })
}

// Used by the portal to land the client on their single conversation with
// the professional whose workspace they're viewing. Creates it on first load
// so a fresh client doesn't see an empty "no thread" state.
export async function getOrCreatePortalConversation() {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return null
  return withRLS(async (tx) => {
    // Resolve both sides through the authenticated user's identity. Both
    // lookups pass RLS — the professional row is visible to members of the
    // same org via policy, and the client row is visible to its own user.
    const [pro] = await tx
      .select({ id: professionals.id })
      .from(professionals)
      .where(eq(professionals.clerkOrgId, orgId))
      .limit(1)
    const [client] = await tx
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.clerkUserId, userId))
      .limit(1)
    if (!pro || !client) return null

    const [existing] = await tx
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.professionalId, pro.id),
          eq(conversations.clientId, client.id),
        ),
      )
      .limit(1)
    if (existing) return { conversation: existing, clientId: client.id }

    const [created] = await tx
      .insert(conversations)
      .values({ professionalId: pro.id, clientId: client.id })
      .returning()
    if (!created) return null
    return { conversation: created, clientId: client.id }
  })
}

// Sum of all unread messages across the current user's conversations.
// Used for the sidebar badge. `asRole` decides which side counts as "unread":
// a professional counts client-authored messages; a client counts the inverse.
export async function getUnreadCount(
  asRole: "professional" | "client",
): Promise<number> {
  const senderToCount = asRole === "professional" ? "client" : "professional"
  return withRLS(async (tx) => {
    const rows = await tx
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(messages)
      .where(
        and(
          eq(messages.senderRole, senderToCount),
          isNull(messages.readAt),
        ),
      )
    return rows[0]?.count ?? 0
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
