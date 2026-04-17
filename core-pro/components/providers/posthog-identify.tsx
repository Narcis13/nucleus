"use client"

import { useUser } from "@clerk/nextjs"
import { usePostHog } from "posthog-js/react"
import { useEffect } from "react"

import { useProfessional } from "@/hooks/use-professional"
import { useUserRole } from "@/hooks/use-user-role"

// Identifies the signed-in Clerk user in PostHog with non-PII traits (role,
// plan, org). Runs once Clerk + the org membership resolve so the plan tier is
// accurate on first load. Email / full name are intentionally omitted — GDPR.
export function PostHogIdentify() {
  const { user, isSignedIn } = useUser()
  const { role, isLoaded: roleLoaded } = useUserRole()
  const pro = useProfessional()
  const posthog = usePostHog()

  useEffect(() => {
    if (!posthog) return
    if (!posthog.__loaded) return
    if (!isSignedIn || !user) {
      posthog.reset()
      return
    }
    if (!roleLoaded || !pro.isLoaded) return

    posthog.identify(user.id, {
      clerk_user_id: user.id,
      role: role ?? "unknown",
      plan: pro.plan,
      has_org: Boolean(pro.orgId),
    })

    if (pro.orgId) {
      posthog.group("organization", pro.orgId, {
        plan: pro.plan,
      })
    }
  }, [posthog, user, isSignedIn, role, roleLoaded, pro])

  return null
}
