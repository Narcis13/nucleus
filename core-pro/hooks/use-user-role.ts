"use client"

import { useAuth, useOrganization, useUser } from "@clerk/nextjs"

import type { UserRole } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// useUserRole
//
// Returns the caller's role in the app. Used by client components that gate
// navigation or UI (e.g. "Invite client" button in the sidebar).
//
// Derivation matches the server-side `getCurrentUserRole` helper:
//   - admin       → publicMetadata.role === "admin" on the Clerk user
//   - professional → org admin/owner, or no org at all
//   - client      → plain org member
//   - null        → signed out / still loading
// ─────────────────────────────────────────────────────────────────────────────
export function useUserRole(): {
  isLoaded: boolean
  role: UserRole | null
} {
  const { isLoaded: authLoaded, isSignedIn } = useAuth()
  const { isLoaded: userLoaded, user } = useUser()
  const { isLoaded: orgLoaded, membership, organization } = useOrganization()

  const isLoaded = authLoaded && userLoaded && orgLoaded

  if (!isLoaded) return { isLoaded: false, role: null }
  if (!isSignedIn || !user) return { isLoaded: true, role: null }

  const publicRole = (user.publicMetadata as { role?: string } | undefined)?.role
  if (publicRole === "admin") return { isLoaded: true, role: "admin" }

  if (organization && membership) {
    const orgRole = membership.role
    if (orgRole === "org:admin" || orgRole === "admin") {
      return { isLoaded: true, role: "professional" }
    }
    return { isLoaded: true, role: "client" }
  }

  return { isLoaded: true, role: "professional" }
}
