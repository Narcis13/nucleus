"use client"

import { createContext, useContext, type ReactNode } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// Portal Supabase auth context
//
// Flips the `useSupabaseBrowser` hook (see `./client.ts`) into the
// portal-token branch. Wrap the portal authenticated subtree once, in the
// portal layout — every shared component that uses Supabase (chat, documents,
// realtime hooks) will then fetch tokens from `/api/portal/sb-token` instead
// of asking Clerk.
// ─────────────────────────────────────────────────────────────────────────────

const PortalSupabaseContext = createContext(false)

export function PortalSupabaseAuthProvider({
  children,
}: {
  children: ReactNode
}) {
  return (
    <PortalSupabaseContext.Provider value={true}>
      {children}
    </PortalSupabaseContext.Provider>
  )
}

export function useIsPortalSupabaseContext(): boolean {
  return useContext(PortalSupabaseContext)
}
