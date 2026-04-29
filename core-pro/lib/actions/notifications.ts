"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { authedAction } from "@/lib/actions/safe-action"
import { getNotificationPreferences } from "@/lib/services/notifications/get-preferences"
import { markAllNotificationsRead } from "@/lib/services/notifications/mark-all-read"
import { markNotificationRead } from "@/lib/services/notifications/mark-read"
import { sendTestNotification } from "@/lib/services/notifications/send-test"
import { subscribePush } from "@/lib/services/notifications/subscribe-push"
import { unsubscribePush } from "@/lib/services/notifications/unsubscribe-push"
import { updateNotificationPreferences } from "@/lib/services/notifications/update-preferences"
import type { NotificationPreferences } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// Server actions for the notification center + preferences + browser push.
//
// Every action resolves the *current* user to either a professional or a
// client row (in the service layer), then scopes work accordingly. Callers
// never pass a userId — the server always derives it from the Clerk session.
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
  .action(async ({ parsedInput, ctx }) => {
    const result = await markNotificationRead(ctx, parsedInput)
    revalidatePath("/dashboard/notifications")
    revalidatePath("/portal")
    return result
  })

export const markAllNotificationsReadAction = authedAction
  .metadata({ actionName: "notifications.markAllRead" })
  .inputSchema(z.object({}))
  .action(async ({ ctx }) => {
    const result = await markAllNotificationsRead(ctx)
    revalidatePath("/dashboard/notifications")
    revalidatePath("/portal")
    return result
  })

export const updateNotificationPreferencesAction = authedAction
  .metadata({ actionName: "notifications.updatePreferences" })
  .inputSchema(notificationPreferencesSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await updateNotificationPreferences(
      ctx,
      parsedInput as NotificationPreferences,
    )
    revalidatePath("/dashboard/settings/notifications")
    revalidatePath("/portal")
    return result
  })

export const getNotificationPreferencesAction = authedAction
  .metadata({ actionName: "notifications.getPreferences" })
  .inputSchema(z.object({}))
  .action(async ({ ctx }) => {
    return await getNotificationPreferences(ctx)
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
  .action(async ({ parsedInput, ctx }) => {
    return await subscribePush(ctx, parsedInput)
  })

export const unsubscribePushAction = authedAction
  .metadata({ actionName: "notifications.unsubscribePush" })
  .inputSchema(z.object({ endpoint: z.string().url() }))
  .action(async ({ parsedInput, ctx }) => {
    return await unsubscribePush(ctx, parsedInput)
  })

// Fires a sample notification to the current user. Used by the settings page
// to let users verify delivery before relying on it in production.
export const sendTestNotificationAction = authedAction
  .metadata({ actionName: "notifications.sendTest" })
  .inputSchema(z.object({}))
  .action(async ({ ctx }) => {
    return await sendTestNotification(ctx)
  })
