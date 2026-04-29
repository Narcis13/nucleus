import "server-only"

import { logError } from "@/lib/audit/log"
import { env } from "@/lib/env"
import { createNotification } from "@/lib/db/queries/notifications"
import {
  getRecipientContact,
  type RecipientKey,
} from "@/lib/db/queries/notification-settings"
import { listPushSubscriptionsForUser } from "@/lib/db/queries/push-subscriptions"
import { resolveChannels } from "@/lib/notifications/preferences"
import { sendPush } from "@/lib/notifications/push"
import { resolveBrandForRecipient } from "@/lib/resend/brand"
import { getResend, fromAddress } from "@/lib/resend/client"
import type {
  NotificationChannel,
  NotificationType,
  Notification as NotificationRow,
} from "@/types/domain"

import NotificationEmail from "@/emails/notification"

// ─────────────────────────────────────────────────────────────────────────────
// sendNotification — one entrypoint that:
//   1. Creates the in-app row (so the bell always reflects unread state).
//   2. Sends an email via Resend (when the channel is requested + enabled).
//   3. Fans out to every registered push subscription for the recipient.
//
// Channel delivery respects user preferences AND quiet hours. The in-app row
// is always written, even inside quiet hours, so unread counts stay correct.
//
// The function is resilient: a failure in any one channel is logged but
// does not prevent the others from firing. The return value
// surfaces what actually happened so callers can act on it (for example, to
// show "push couldn't be delivered" in a settings test-notification flow).
// ─────────────────────────────────────────────────────────────────────────────

export type SendNotificationInput = {
  userId: string
  userType: "professional" | "client"
  type: NotificationType
  title: string
  body?: string | null
  link?: string | null
  channels?: NotificationChannel[]
  metadata?: Record<string, unknown>
}

export type SendNotificationResult = {
  notification: NotificationRow | null
  delivered: {
    in_app: boolean
    email: boolean
    push: { attempted: number; delivered: number }
  }
  skipped: NotificationChannel[]
}

const DEFAULT_CHANNELS: NotificationChannel[] = ["in_app", "email", "push"]

export async function sendNotification(
  input: SendNotificationInput,
): Promise<SendNotificationResult> {
  const requested = input.channels ?? DEFAULT_CHANNELS

  const recipientKey: RecipientKey = {
    userId: input.userId,
    userType: input.userType,
  }
  const contact = await getRecipientContact(recipientKey)

  // Resolve which channels actually pass the user's prefs + quiet hours. The
  // in-app channel is always re-included below so the record exists regardless
  // of whether delivery channels were suppressed — see quiet-hours policy.
  const allowed = contact
    ? resolveChannels({
        requested,
        prefs: contact.preferences,
        type: input.type,
        timezone: contact.timezone,
      })
    : requested.slice()

  const skipped = requested.filter((c) => !allowed.includes(c))

  const result: SendNotificationResult = {
    notification: null,
    delivered: { in_app: false, email: false, push: { attempted: 0, delivered: 0 } },
    skipped,
  }

  // 1) In-app row — always written when in_app was requested. This row is what
  //    drives the bell and the real-time subscription, so we want it even if
  //    preferences suppressed other channels.
  if (requested.includes("in_app")) {
    try {
      result.notification = await createNotification({
        userId: input.userId,
        userType: input.userType,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        metadata: input.metadata ?? null,
      })
      result.delivered.in_app = true
    } catch (err) {
      logError(err, {
        source: "notification:in_app",
        professionalId: input.userType === "professional" ? input.userId : null,
        clientId: input.userType === "client" ? input.userId : null,
        metadata: { type: input.type },
      })
    }
  }

  // 2) Email — only when recipient has an address and the channel survived
  //    preference resolution.
  if (allowed.includes("email") && contact?.email) {
    try {
      const resend = getResend()
      if (resend) {
        // Pull the recipient's owning professional's brand so the email body
        // matches what the preview route renders. Falls through to the
        // template's "CorePro" fallback when no owner can be resolved.
        const brand = await resolveBrandForRecipient(recipientKey)
        await resend.emails.send({
          from: fromAddress(),
          to: [contact.email],
          subject: input.title,
          react: NotificationEmail({
            professionalName: brand?.professionalName,
            branding: brand?.branding ?? null,
            unsubscribeUrl: brand?.unsubscribeUrl,
            locale: brand?.locale,
            recipientName: contact.fullName ?? null,
            title: input.title,
            body: input.body ?? null,
            link: absoluteUrl(input.link),
            appUrl: brand?.appUrl ?? env.NEXT_PUBLIC_APP_URL,
          }),
        })
        result.delivered.email = true
      }
    } catch (err) {
      logError(err, {
        source: "notification:email",
        professionalId: input.userType === "professional" ? input.userId : null,
        clientId: input.userType === "client" ? input.userId : null,
        metadata: { type: input.type },
      })
    }
  }

  // 3) Push — fan out to every active subscription. Failures per-subscription
  //    don't cancel the others; expired subs are cleaned up inside sendPush().
  if (allowed.includes("push")) {
    try {
      const subs = await listPushSubscriptionsForUser(recipientKey)
      result.delivered.push.attempted = subs.length
      for (const sub of subs) {
        const res = await sendPush(sub, {
          title: input.title,
          body: input.body ?? undefined,
          url: absoluteUrl(input.link),
          tag: `${input.type}:${result.notification?.id ?? input.userId}`,
        })
        if (res.delivered) result.delivered.push.delivered += 1
      }
    } catch (err) {
      logError(err, {
        source: "notification:push",
        professionalId: input.userType === "professional" ? input.userId : null,
        clientId: input.userType === "client" ? input.userId : null,
        metadata: { type: input.type },
      })
    }
  }

  return result
}

function absoluteUrl(link: string | null | undefined): string | undefined {
  if (!link) return undefined
  if (link.startsWith("http://") || link.startsWith("https://")) return link
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
  const path = link.startsWith("/") ? link : `/${link}`
  return `${base}${path}`
}
