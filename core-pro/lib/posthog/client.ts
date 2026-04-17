"use client"

import posthog from "posthog-js"

// Re-export the posthog-js singleton so callers can import it from the same
// path as the server module. PostHogProvider handles initialization (see
// components/providers/posthog-provider.tsx); anything imported before init
// becomes a no-op until the script loads.
export { posthog }

export type ClientEventProperties = Record<string, unknown>

// Fire a client-side event. Returns the posthog instance so callers can chain
// (rare, but mirrors the underlying SDK). No-op when posthog isn't loaded
// (GDPR consent not granted, key missing, or SSR context).
export function captureClientEvent(
  event: string,
  properties?: ClientEventProperties,
): void {
  if (typeof window === "undefined") return
  if (!posthog.__loaded) return
  posthog.capture(event, properties)
}
