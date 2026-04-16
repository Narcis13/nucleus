"use client"

import { useUser } from "@clerk/nextjs"
import { usePostHog } from "posthog-js/react"
import { useEffect } from "react"

/**
 * Identifies the signed-in Clerk user in PostHog.
 * Place inside a layout that has both ClerkProvider and PostHogProvider.
 */
export function PostHogIdentify() {
  const { user, isSignedIn } = useUser()
  const posthog = usePostHog()

  useEffect(() => {
    if (!posthog) return

    if (isSignedIn && user) {
      posthog.identify(user.id, {
        clerk_user_id: user.id,
        // Do NOT send email or name to PostHog — GDPR.
        // Org context will be set after org selection (Session 4).
      })
    } else {
      posthog.reset()
    }
  }, [posthog, user, isSignedIn])

  return null
}
