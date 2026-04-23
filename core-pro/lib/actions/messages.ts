"use server"

import { auth } from "@clerk/nextjs/server"
import { z } from "zod"

import { ActionError, authedAction } from "@/lib/actions/safe-action"
import {
  getMessages as getMessagesQuery,
  getOrCreateConversation as getOrCreateConversationQuery,
  markMessagesRead,
  sendMessage as sendMessageQuery,
} from "@/lib/db/queries/messages"
import { getProfessional } from "@/lib/db/queries/professionals"
import { trackServerEvent } from "@/lib/posthog/events"
import { dbAdmin } from "@/lib/db/client"
import { clients, conversations } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { env } from "@/lib/env"

// ─────────────────────────────────────────────────────────────────────────────
// Schemas — shared between the chat UIs (dashboard + portal). Message content
// is optional because media-only messages (image/file upload) are valid.
// ─────────────────────────────────────────────────────────────────────────────
const sendSchema = z
  .object({
    conversationId: z.string().uuid(),
    content: z.string().max(4000).optional(),
    type: z.enum(["text", "image", "file"]).default("text"),
    mediaUrl: z.string().url().optional(),
  })
  .refine((v) => (v.content && v.content.trim().length > 0) || v.mediaUrl, {
    message: "Message must have content or a media attachment.",
  })

const getOrCreateSchema = z.object({
  clientId: z.string().uuid(),
})

const idSchema = z.object({ conversationId: z.string().uuid() })

// ─────────────────────────────────────────────────────────────────────────────
// sendMessageAction — resolves the sender side (professional vs client)
// from Clerk/Drizzle context so the callers don't have to pass it in. Inserts
// the message + bumps `last_message_at` atomically via the query helper.
// ─────────────────────────────────────────────────────────────────────────────
export const sendMessageAction = authedAction
  .metadata({ actionName: "messages.send" })
  .inputSchema(sendSchema)
  .action(async ({ parsedInput }) => {
    const sender = await resolveSender()
    if (!sender) throw new ActionError("Unauthorized")

    const created = await sendMessageQuery({
      conversationId: parsedInput.conversationId,
      senderId: sender.id,
      senderRole: sender.role,
      content: parsedInput.content?.trim() || undefined,
      type: parsedInput.type,
      mediaUrl: parsedInput.mediaUrl,
    })

    const { userId } = await auth()
    if (userId) {
      void trackServerEvent("message_sent", {
        distinctId: userId,
        conversationId: parsedInput.conversationId,
        senderRole: sender.role,
        messageType: parsedInput.type,
      })
    }

    // No revalidatePath here: Realtime + optimistic client state carry the
    // UI. revalidatePath on a rapid-fire path stacks RSC renders and races
    // with router.refresh() elsewhere (see feedback memory on Next 16).
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
  })

// ─────────────────────────────────────────────────────────────────────────────
// getOrCreateConversationAction — called from the client detail page's "Send
// message" button. Always resolves the current professional server-side; the
// client id is validated as belonging to them via RLS.
// ─────────────────────────────────────────────────────────────────────────────
export const getOrCreateConversationAction = authedAction
  .metadata({ actionName: "messages.getOrCreate" })
  .inputSchema(getOrCreateSchema)
  .action(async ({ parsedInput }) => {
    const professional = await getProfessional()
    if (!professional) throw new ActionError("Unauthorized")
    const conversation = await getOrCreateConversationQuery(parsedInput.clientId)
    return { id: conversation.id }
  })

// Single round-trip for the inline client-profile chat tab: opens (or
// creates) the conversation and returns it with its existing messages. The
// tab uses this to hydrate without a second request.
export const openClientConversationAction = authedAction
  .metadata({ actionName: "messages.openClientConversation" })
  .inputSchema(getOrCreateSchema)
  .action(async ({ parsedInput }) => {
    const professional = await getProfessional()
    if (!professional) throw new ActionError("Unauthorized")
    const conversation = await getOrCreateConversationQuery(parsedInput.clientId)
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
  })

// ─────────────────────────────────────────────────────────────────────────────
// markMessagesAsReadAction — marks the *incoming* side of the thread as read
// for the caller. Idempotent; returns the number of rows flipped.
// ─────────────────────────────────────────────────────────────────────────────
export const markMessagesAsReadAction = authedAction
  .metadata({ actionName: "messages.markRead" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput }) => {
    const sender = await resolveSender()
    if (!sender) throw new ActionError("Unauthorized")
    const result = await markMessagesRead(parsedInput.conversationId, sender.role)
    // No revalidate: the UPDATE broadcasts via Realtime and optimistic
    // client state clears unread badges without an RSC round-trip.
    return { count: result.length }
  })

// ─────────────────────────────────────────────────────────────────────────────
// simulateClientReplyAction — DEV-ONLY. Inserts a message into the given
// conversation as if the client had sent it, so a solo developer can test the
// two-way realtime flow without running a second Clerk session in the portal.
// Production requests are rejected; the message goes through the same insert
// path as a real send so Realtime + unread counts + revalidation all behave
// identically.
// ─────────────────────────────────────────────────────────────────────────────
const simulateSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(4000),
})

export const simulateClientReplyAction = authedAction
  .metadata({ actionName: "messages.simulateClientReply" })
  .inputSchema(simulateSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (env.NODE_ENV === "production") {
      throw new ActionError("Not available in production.")
    }

    const professional = await getProfessional()
    if (!professional) throw new ActionError("Unauthorized")

    // Resolve the conversation's clientId via the RLS-scoped tx — this
    // doubles as authorization (the pro can only see their own threads).
    const [convo] = await ctx.db
      .select({ clientId: conversations.clientId })
      .from(conversations)
      .where(eq(conversations.id, parsedInput.conversationId))
      .limit(1)
    if (!convo) throw new ActionError("Conversation not found")

    const created = await sendMessageQuery({
      conversationId: parsedInput.conversationId,
      senderId: convo.clientId,
      senderRole: "client",
      content: parsedInput.content.trim(),
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
  })

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Resolves the current Clerk user to one of { professional, client } with
// their internal uuid. Uses dbAdmin for the client-side lookup to avoid
// opening a second RLS transaction inside the action (the outer authedAction
// is already in one). For the professional side we reuse `getProfessional`.
async function resolveSender(): Promise<
  { id: string; role: "professional" | "client" } | null
> {
  const professional = await getProfessional()
  if (professional) return { id: professional.id, role: "professional" }

  const { userId } = await auth()
  if (!userId) return null
  const rows = await dbAdmin
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.clerkUserId, userId))
    .limit(1)
  const clientRow = rows[0]
  if (!clientRow) return null
  return { id: clientRow.id, role: "client" }
}
