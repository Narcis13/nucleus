"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"
import { z } from "zod"

import { ActionError, authedAction } from "@/lib/actions/safe-action"
import { dbAdmin } from "@/lib/db/client"
import { clients, professionals } from "@/lib/db/schema"
import {
  markAllAsRead,
  markAsRead,
} from "@/lib/db/queries/notifications"
import {
  getMyNotificationPreferences,
  updateMyNotificationPreferences,
  type RecipientKey,
} from "@/lib/db/queries/notification-settings"
import {
  deletePushSubscriptionByEndpoint,
  upsertPushSubscription,
} from "@/lib/db/queries/push-subscriptions"
import { sendNotification } from "@/lib/notifications/send"
import type { NotificationPreferences } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// Server actions for the notification center + preferences + browser push.
//
// Every action resolves the *current* user to either a professional or a
// client row, then scopes work accordingly. Callers never pass a userId — the
// server always derives it from the Clerk session.
// ─────────────────────────────────────────────────────────────────────────────

const notificationPreferencesSchema = z.object({
  per_type: z
    .object({
      message: z.boolean().optional(),
      appointment: z.boolean().optional(),
      form: z.boolean().optional(),
      lead: z.boolean().optional(),
      invoice: z.boolean().optional(),
      document: z.boolean().optional(),
      system: z.boolean().optional(),
    })
    .partial()
    .optional(),
  per_channel: z
    .object({
      in_app: z.boolean().optional(),
      email: z.boolean().optional(),
      push: z.boolean().optional(),
    })
    .partial()
    .optional(),
  quiet_hours: z
    .object({
      enabled: z.boolean(),
      start: z.string().regex(/^\d{1,2}:\d{2}$/),
      end: z.string().regex(/^\d{1,2}:\d{2}$/),
    })
    .optional(),
})

// ── Actions ────────────────────────────────────────────────────────────────

export const markNotificationReadAction = authedAction
  .metadata({ actionName: "notifications.markRead" })
  .inputSchema(z.object({ id: z.string().uuid() }))
  .action(async ({ parsedInput }) => {
    const rows = await markAsRead(parsedInput.id)
    revalidatePath("/dashboard/notifications")
    revalidatePath("/portal")
    return { count: rows.length }
  })

export const markAllNotificationsReadAction = authedAction
  .metadata({ actionName: "notifications.markAllRead" })
  .inputSchema(z.object({}))
  .action(async () => {
    const recipient = await resolveRecipient()
    if (!recipient) throw new ActionError("Unauthorized")
    const rows = await markAllAsRead(recipient)
    revalidatePath("/dashboard/notifications")
    revalidatePath("/portal")
    return { count: rows.length }
  })

export const updateNotificationPreferencesAction = authedAction
  .metadata({ actionName: "notifications.updatePreferences" })
  .inputSchema(notificationPreferencesSchema)
  .action(async ({ parsedInput }) => {
    const recipient = await resolveRecipient()
    if (!recipient) throw new ActionError("Unauthorized")
    const stored = await updateMyNotificationPreferences(
      recipient,
      parsedInput as NotificationPreferences,
    )
    revalidatePath("/dashboard/settings/notifications")
    revalidatePath("/portal")
    return { preferences: stored }
  })

export const getNotificationPreferencesAction = authedAction
  .metadata({ actionName: "notifications.getPreferences" })
  .inputSchema(z.object({}))
  .action(async () => {
    const recipient = await resolveRecipient()
    if (!recipient) throw new ActionError("Unauthorized")
    const prefs = await getMyNotificationPreferences(recipient)
    return { preferences: prefs }
  })

// ── Push subscription lifecycle ────────────────────────────────────────────

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  userAgent: z.string().optional(),
})

export const subscribePushAction = authedAction
  .metadata({ actionName: "notifications.subscribePush" })
  .inputSchema(subscribeSchema)
  .action(async ({ parsedInput }) => {
    const recipient = await resolveRecipient()
    if (!recipient) throw new ActionError("Unauthorized")
    const row = await upsertPushSubscription({
      ...recipient,
      endpoint: parsedInput.endpoint,
      p256dh: parsedInput.p256dh,
      auth: parsedInput.auth,
      userAgent: parsedInput.userAgent ?? null,
    })
    return { id: row.id }
  })

export const unsubscribePushAction = authedAction
  .metadata({ actionName: "notifications.unsubscribePush" })
  .inputSchema(z.object({ endpoint: z.string().url() }))
  .action(async ({ parsedInput }) => {
    await deletePushSubscriptionByEndpoint({ endpoint: parsedInput.endpoint })
    return { ok: true }
  })

// Fires a sample notification to the current user. Used by the settings page
// to let users verify delivery before relying on it in production.
export const sendTestNotificationAction = authedAction
  .metadata({ actionName: "notifications.sendTest" })
  .inputSchema(z.object({}))
  .action(async () => {
    const recipient = await resolveRecipient()
    if (!recipient) throw new ActionError("Unauthorized")
    const result = await sendNotification({
      ...recipient,
      type: "system",
      title: "Test notification",
      body: "If you can read this, your notifications are wired up correctly.",
      link:
        recipient.userType === "professional"
          ? "/dashboard/notifications"
          : "/portal",
    })
    return {
      in_app: result.delivered.in_app,
      email: result.delivered.email,
      push: result.delivered.push,
    }
  })

// ── Helpers ────────────────────────────────────────────────────────────────

async function resolveRecipient(): Promise<RecipientKey | null> {
  const { userId } = await auth()
  if (!userId) return null

  const pro = await dbAdmin
    .select({ id: professionals.id })
    .from(professionals)
    .where(eq(professionals.clerkUserId, userId))
    .limit(1)
  if (pro[0]) return { userId: pro[0].id, userType: "professional" }

  const cli = await dbAdmin
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.clerkUserId, userId))
    .limit(1)
  if (cli[0]) return { userId: cli[0].id, userType: "client" }

  return null
}
