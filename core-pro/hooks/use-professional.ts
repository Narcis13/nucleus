"use client"

import { useOrganization, useUser } from "@clerk/nextjs"
import { useMemo } from "react"

import type { Branding, PlanLimits } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// useProfessional
//
// Returns the currently-signed-in professional's identity + plan context, as
// surfaced through Clerk (user, org, publicMetadata). Intentionally does NOT
// fetch the Drizzle `professionals` row — server components already have
// `getProfessional()` for that, and doing it here would force a client round
// trip on every navigation.
//
// `isLoaded` mirrors Clerk's loading state so callers can guard UI until the
// session is ready. `isProfessional` is false when the user is signed out, or
// has an org role that's not admin/owner (i.e. they're a client in a pro's
// workspace).
// ─────────────────────────────────────────────────────────────────────────────
export type ProfessionalContext = {
  isLoaded: boolean
  isProfessional: boolean
  userId: string | null
  orgId: string | null
  email: string | null
  fullName: string | null
  avatarUrl: string | null
  plan: string
  planLimits: PlanLimits | null
  branding: Branding | null
}

export function useProfessional(): ProfessionalContext {
  const { isLoaded: userLoaded, user } = useUser()
  const { isLoaded: orgLoaded, organization, membership } = useOrganization()

  return useMemo(() => {
    const isLoaded = userLoaded && orgLoaded
    if (!isLoaded || !user) {
      return {
        isLoaded,
        isProfessional: false,
        userId: null,
        orgId: null,
        email: null,
        fullName: null,
        avatarUrl: null,
        plan: "starter",
        planLimits: null,
        branding: null,
      }
    }

    // Plan + limits + branding are mirrored onto publicMetadata so the client
    // sees them without an extra DB hop. Stripe webhook keeps them in sync.
    const metadata = (user.publicMetadata ?? {}) as {
      plan?: string
      plan_limits?: PlanLimits
      branding?: Branding
    }
    const orgMetadata = (organization?.publicMetadata ?? {}) as {
      plan?: string
      plan_limits?: PlanLimits
      branding?: Branding
    }

    const role = membership?.role
    const isProfessional =
      !role || role === "org:admin" || role === "admin"

    return {
      isLoaded: true,
      isProfessional,
      userId: user.id,
      orgId: organization?.id ?? null,
      email: user.primaryEmailAddress?.emailAddress ?? null,
      fullName: user.fullName ?? null,
      avatarUrl: user.imageUrl ?? null,
      plan: orgMetadata.plan ?? metadata.plan ?? "starter",
      planLimits: orgMetadata.plan_limits ?? metadata.plan_limits ?? null,
      branding: orgMetadata.branding ?? metadata.branding ?? null,
    }
  }, [userLoaded, orgLoaded, user, organization, membership])
}
