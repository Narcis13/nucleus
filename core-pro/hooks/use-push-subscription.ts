"use client"

import { useCallback, useEffect, useState } from "react"

import {
  subscribePushAction,
  unsubscribePushAction,
} from "@/lib/actions/notifications"

// ─────────────────────────────────────────────────────────────────────────────
// usePushSubscription
//
// Client-side bridge for Web Push:
//   • Detects browser support (ServiceWorker + Notification + PushManager).
//   • Registers /sw.js on mount.
//   • Tracks current permission + subscription state.
//   • Exposes `subscribe()` / `unsubscribe()` that request permission,
//     hit PushManager, and mirror the resulting subscription into our DB via
//     server actions.
//
// Failures (permission denied, VAPID key unavailable, browser blocks the
// subscribe) are exposed on the `error` field so the settings UI can render a
// useful message without us having to throw.
// ─────────────────────────────────────────────────────────────────────────────

export type PushSubscriptionState =
  | "unsupported"
  | "loading"
  | "denied"
  | "unavailable" // supported, but no VAPID key on the server — feature disabled
  | "idle" // supported + permission not yet granted
  | "subscribed" // permission granted + active subscription
  | "unsubscribed" // permission granted but no subscription

export function usePushSubscription(): {
  state: PushSubscriptionState
  error: string | null
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
} {
  const [state, setState] = useState<PushSubscriptionState>("loading")
  const [error, setError] = useState<string | null>(null)

  // Initial probe — detect support, fetch VAPID key, check existing subscription.
  useEffect(() => {
    let cancelled = false

    const probe = async () => {
      if (typeof window === "undefined") return
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        if (!cancelled) setState("unsupported")
        return
      }
      // PwaProvider skips SW registration in dev (and unregisters stale ones).
      // This hook also calls register("/sw.js"), so gate it the same way.
      if (process.env.NODE_ENV !== "production") {
        if (!cancelled) setState("unsupported")
        return
      }

      const vapidAvailable = await fetchVapidKey()
        .then(() => true)
        .catch(() => false)
      if (!vapidAvailable) {
        if (!cancelled) setState("unavailable")
        return
      }

      if (Notification.permission === "denied") {
        if (!cancelled) setState("denied")
        return
      }

      try {
        const reg = await navigator.serviceWorker.register("/sw.js")
        const existing = await reg.pushManager.getSubscription()
        if (cancelled) return
        if (existing) {
          setState("subscribed")
          return
        }
        setState(Notification.permission === "granted" ? "unsubscribed" : "idle")
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Unknown error")
        setState("unsupported")
      }
    }

    void probe()
    return () => {
      cancelled = true
    }
  }, [])

  const subscribe = useCallback(async () => {
    setError(null)
    try {
      if (Notification.permission === "default") {
        const granted = await Notification.requestPermission()
        if (granted !== "granted") {
          setState(granted === "denied" ? "denied" : "idle")
          return
        }
      }
      const publicKey = await fetchVapidKey()
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
      const payload = toServerPayload(sub)
      await subscribePushAction({
        endpoint: payload.endpoint,
        p256dh: payload.p256dh,
        auth: payload.auth,
        userAgent: navigator.userAgent,
      })
      setState("subscribed")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Subscribe failed")
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    setError(null)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await unsubscribePushAction({ endpoint: sub.endpoint })
        await sub.unsubscribe()
      }
      setState("unsubscribed")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unsubscribe failed")
    }
  }, [])

  return { state, error, subscribe, unsubscribe }
}

// ── helpers ────────────────────────────────────────────────────────────────

async function fetchVapidKey(): Promise<string> {
  const res = await fetch("/api/push/vapid-public-key", { cache: "no-store" })
  if (!res.ok) throw new Error("vapid-not-configured")
  const json = (await res.json()) as { publicKey?: string }
  if (!json.publicKey) throw new Error("vapid-not-configured")
  return json.publicKey
}

// PushManager wants a BufferSource; the VAPID public key is a URL-safe base64
// string. Allocate into a fresh ArrayBuffer (not SharedArrayBuffer) so the
// resulting Uint8Array satisfies `applicationServerKey`'s BufferSource type.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  const buffer = new ArrayBuffer(raw.length)
  const out = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function toServerPayload(sub: PushSubscription): {
  endpoint: string
  p256dh: string
  auth: string
} {
  const json = sub.toJSON() as {
    endpoint?: string
    keys?: { p256dh?: string; auth?: string }
  }
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("incomplete-subscription")
  }
  return {
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  }
}
