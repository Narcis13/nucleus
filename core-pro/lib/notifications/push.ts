import "server-only"

import type { PushSubscription } from "@/types/domain"

import { deletePushSubscriptionByEndpointAdmin } from "@/lib/db/queries/push-subscriptions"

// ─────────────────────────────────────────────────────────────────────────────
// Web Push delivery.
//
// We support three configurations, in priority order:
//
//   1. `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` + `VAPID_SUBJECT` set AND the
//      optional `web-push` package installed → real Web Push delivery via the
//      `web-push` SDK. Dynamic import keeps the package optional so a fresh
//      clone of the repo without `web-push` still typechecks / builds.
//
//   2. VAPID keys unset → no-op with a single warn log. Used in local dev when
//      the developer hasn't generated VAPID keys yet. The subscribe / service
//      worker / DB plumbing remains exercised; only delivery is skipped.
//
//   3. VAPID keys set but `web-push` not installed → no-op with a single warn
//      log explaining how to enable delivery. Lets the rest of the feature
//      ship without making `web-push` a hard dependency.
//
// Expired subscriptions (404/410 from the push endpoint) are cleaned up so
// the table doesn't collect stale rows forever.
// ─────────────────────────────────────────────────────────────────────────────

export type PushPayload = {
  title: string
  body?: string
  url?: string
  icon?: string
  tag?: string
}

export async function sendPush(
  subscription: PushSubscription,
  payload: PushPayload,
): Promise<{ delivered: boolean; reason?: string }> {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject =
    process.env.VAPID_SUBJECT ?? `mailto:${process.env.RESEND_FROM_EMAIL ?? ""}`

  if (!publicKey || !privateKey) {
    warnOnce(
      "push.vapid-missing",
      "Web Push skipped — VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY not set.",
    )
    return { delivered: false, reason: "vapid-not-configured" }
  }

  const webpush = await loadWebPush()
  if (!webpush) {
    warnOnce(
      "push.webpush-missing",
      "Web Push skipped — `web-push` package is not installed. Run `npm i web-push` to enable delivery.",
    )
    return { delivered: false, reason: "web-push-not-installed" }
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload),
    )
    return { delivered: true }
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode
    if (status === 404 || status === 410) {
      // Endpoint is gone — drop the row so we don't keep retrying.
      await deletePushSubscriptionByEndpointAdmin(subscription.endpoint)
      return { delivered: false, reason: "subscription-expired" }
    }
    return { delivered: false, reason: `push-error:${status ?? "unknown"}` }
  }
}

// ── internals ───────────────────────────────────────────────────────────────

type WebPushModule = {
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void
  sendNotification: (
    subscription: {
      endpoint: string
      keys: { p256dh: string; auth: string }
    },
    payload: string,
  ) => Promise<unknown>
}

let cached: WebPushModule | null | undefined
async function loadWebPush(): Promise<WebPushModule | null> {
  if (cached !== undefined) return cached
  try {
    // `web-push` is an optional peer dependency — we resolve its specifier at
    // runtime (via a string variable) so TypeScript/Next don't try to load
    // types at compile time. A missing install returns null cleanly.
    const moduleName = "web-push"
    const mod = (await import(/* webpackIgnore: true */ moduleName)) as {
      default?: WebPushModule
    } & WebPushModule
    cached = mod.default ?? mod
  } catch {
    cached = null
  }
  return cached
}

const warned = new Set<string>()
function warnOnce(key: string, message: string) {
  if (warned.has(key)) return
  warned.add(key)
  console.warn(`[notifications] ${message}`)
}
