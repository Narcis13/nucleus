"use client"

import posthog from "posthog-js"
import { PostHogProvider as PHProvider } from "posthog-js/react"
import { useEffect } from "react"

// Consent cookie — set from the cookie banner. Kept in sync with the name used
// by `setAnalyticsConsent` / GDPR settings so the banner, settings page, and
// this provider all agree on one source of truth.
export const CONSENT_COOKIE = "corepro-analytics-consent"
export const REPLAY_COOKIE = "corepro-replay-consent"

function readCookieFlag(name: string): boolean {
  if (typeof document === "undefined") return false
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith(`${name}=true`))
}

function initPostHog(withReplay: boolean): boolean {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
  if (!key || !host) return false
  if (posthog.__loaded) return true

  posthog.init(key, {
    api_host: host,
    person_profiles: "identified_only",
    // Manual page views — see posthog-pageview.tsx. PostHog's auto-capture
    // misses client-side navigations in the App Router.
    capture_pageview: false,
    capture_pageleave: true,
    respect_dnt: true,
    // Session replay is gated independently of analytics consent. Users who
    // agree to analytics might still refuse recordings; treat them as two
    // distinct opt-ins.
    disable_session_recording: !withReplay,
    session_recording: {
      // Block all inputs, emails, phone numbers, addresses. These are the
      // defaults PostHog documents for GDPR-sensitive apps.
      maskAllInputs: true,
      maskTextSelector: "[data-mask]",
      maskInputOptions: {
        password: true,
        email: true,
      },
    },
  })
  return true
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const hasAnalytics = readCookieFlag(CONSENT_COOKIE)
    if (hasAnalytics) {
      initPostHog(readCookieFlag(REPLAY_COOKIE))
    }

    // Respond to consent changes in another tab (settings page flip).
    const onStorage = () => {
      const nextAnalytics = readCookieFlag(CONSENT_COOKIE)
      if (!nextAnalytics && posthog.__loaded) {
        posthog.opt_out_capturing()
      } else if (nextAnalytics && !posthog.__loaded) {
        initPostHog(readCookieFlag(REPLAY_COOKIE))
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
