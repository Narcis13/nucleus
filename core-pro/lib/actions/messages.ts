"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ActionError, authedAction } from "@/lib/actions/safe-action"
import {
  getOrCreateConversation as getOrCreateConversationQuery,
  markMessagesRead,
  sendMessage as sendMessageQuery,
} from "@/lib/db/queries/messages"
import { getProfessional } from "@/lib/db/queries/professionals"
import { trackServerEvent } from "@/lib/posthog/events"
import { dbAdmin } from "@/lib/db/client"
import { clients } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

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

    // Revalidate both sides — the list previews and unread badges depend on
    // the bumped `last_message_at` and the new row. Realtime handles the
    // live rendering; revalidation is the safety net for a cold reload.
    revalidatePath("/dashboard/messages")
    revalidatePath("/portal/messages")
    return { id: created.id, createdAt: created.createdAt.toISOString() }
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
    revalidatePath("/dashboard/messages")
    revalidatePath("/portal/messages")
    return { count: result.length }
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
