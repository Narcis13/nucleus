"use server"

import { z } from "zod"

import { ActionError, authedAction, portalAction } from "@/lib/actions/safe-action"
import { getOrCreateConversation } from "@/lib/services/messages/get-or-create-conversation"
import { markMessagesAsRead } from "@/lib/services/messages/mark-as-read"
import { openClientConversation } from "@/lib/services/messages/open-client-conversation"
import { portalMarkMessagesAsRead } from "@/lib/services/messages/portal-mark-read"
import { portalSendMessage } from "@/lib/services/messages/portal-send"
import { sendMessage } from "@/lib/services/messages/send"
import { simulateClientReply } from "@/lib/services/messages/simulate-client-reply"
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
  .action(async ({ parsedInput, ctx }) => {
    // No revalidatePath here: Realtime + optimistic client state carry the
    // UI. revalidatePath on a rapid-fire path stacks RSC renders and races
    // with router.refresh() elsewhere (see feedback memory on Next 16).
    return sendMessage(ctx, parsedInput)
  })

// ─────────────────────────────────────────────────────────────────────────────
// getOrCreateConversationAction — called from the client detail page's "Send
// message" button. Always resolves the current professional server-side; the
// client id is validated as belonging to them via RLS.
// ─────────────────────────────────────────────────────────────────────────────
export const getOrCreateConversationAction = authedAction
  .metadata({ actionName: "messages.getOrCreate" })
  .inputSchema(getOrCreateSchema)
  .action(async ({ parsedInput, ctx }) => {
    return getOrCreateConversation(ctx, parsedInput)
  })

// Single round-trip for the inline client-profile chat tab: opens (or
// creates) the conversation and returns it with its existing messages. The
// tab uses this to hydrate without a second request.
export const openClientConversationAction = authedAction
  .metadata({ actionName: "messages.openClientConversation" })
  .inputSchema(getOrCreateSchema)
  .action(async ({ parsedInput, ctx }) => {
    return openClientConversation(ctx, parsedInput)
  })

// ─────────────────────────────────────────────────────────────────────────────
// markMessagesAsReadAction — marks the *incoming* side of the thread as read
// for the caller. Idempotent; returns the number of rows flipped.
// ─────────────────────────────────────────────────────────────────────────────
export const markMessagesAsReadAction = authedAction
  .metadata({ actionName: "messages.markRead" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    // No revalidate: the UPDATE broadcasts via Realtime and optimistic
    // client state clears unread badges without an RSC round-trip.
    return markMessagesAsRead(ctx, parsedInput)
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
    return simulateClientReply(ctx, parsedInput)
  })

// ─────────────────────────────────────────────────────────────────────────────
// Portal-side variants — same input/output shape as the dashboard actions,
// but auth comes from the `nucleus_portal` cookie session and the sender is
// fixed to the calling client. Shared chat components accept either via the
// `sendAction` / `markReadAction` props.
// ─────────────────────────────────────────────────────────────────────────────
export const portalSendMessageAction = portalAction
  .metadata({ actionName: "messages.portal.send" })
  .inputSchema(sendSchema)
  .action(async ({ parsedInput, ctx }) => {
    return portalSendMessage(ctx, parsedInput)
  })

export const portalMarkMessagesAsReadAction = portalAction
  .metadata({ actionName: "messages.portal.markRead" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    return portalMarkMessagesAsRead(ctx, parsedInput)
  })
