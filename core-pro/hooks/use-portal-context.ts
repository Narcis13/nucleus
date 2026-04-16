"use client"

import { useOrganization, useUser } from "@clerk/nextjs"
import { useMemo } from "react"

import type { Branding } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// usePortalContext
//
// Returns the current client's identity + the branding of the professional
// whose portal they're viewing. Mirrors the role `useProfessional` plays on
// the dashboard side, but flipped: here the authenticated user is a *client*
// of a professional's org, not the professional themselves.
//
// Clients get access by accepting a Clerk organization invitation, so once
// they're signed in the active `organization` corresponds to the
// professional's workspace. That org's `publicMetadata` mirrors the
// professional's branding + internal `professional_id` (written by the Clerk
// webhook / Stripe webhook), which lets the portal paint the right colors
// immediately on first render — no API hop, no branding flash.
//
// The branding API route (`/api/branding/[professional_id]`) remains the
// authoritative public source; this hook is the cheap client-side path.
// ─────────────────────────────────────────────────────────────────────────────

export type PortalContext = {
  isLoaded: boolean
  professionalId: string | null
  professionalName: string | null
  professionalLogoUrl: string | null
  branding: Branding | null
  client: {
    userId: string | null
    email: string | null
    fullName: string | null
    avatarUrl: string | null
  }
}

const EMPTY: PortalContext = {
  isLoaded: false,
  professionalId: null,
  professionalName: null,
  professionalLogoUrl: null,
  branding: null,
  client: { userId: null, email: null, fullName: null, avatarUrl: null },
}

export function usePortalContext(): PortalContext {
  const { isLoaded: userLoaded, user } = useUser()
  const { isLoaded: orgLoaded, organization } = useOrganization()

  return useMemo(() => {
    const isLoaded = userLoaded && orgLoaded
    if (!isLoaded) return EMPTY

    const orgMetadata = (organization?.publicMetadata ?? {}) as {
      branding?: Branding
      professional_id?: string
    }

    const branding = orgMetadata.branding ?? null

    return {
      isLoaded: true,
      professionalId: orgMetadata.professional_id ?? null,
      professionalName: organization?.name ?? null,
      // Prefer the professional-uploaded logo from branding; fall back to the
      // Clerk org avatar so the header always shows *something* recognisable.
      professionalLogoUrl:
        branding?.logo_url ?? organization?.imageUrl ?? null,
      branding,
      client: {
        userId: user?.id ?? null,
        email: user?.primaryEmailAddress?.emailAddress ?? null,
        fullName: user?.fullName ?? null,
        avatarUrl: user?.imageUrl ?? null,
      },
    }
  }, [userLoaded, orgLoaded, user, organization])
}
