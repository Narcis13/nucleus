"use client"

import { useAuth } from "@clerk/nextjs"
import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { useMemo } from "react"

import { env } from "@/lib/env"

// ─────────────────────────────────────────────────────────────────────────────
// Browser Supabase client — Realtime, Storage, client-side reads.
//
// Auth integration: Clerk's **native Third-Party Auth** (NOT the deprecated
// `getToken({ template: "supabase" })` JWT template). The `accessToken` async
// callback fires on every Supabase request; we hand back Clerk's session
// token, Supabase forwards it to PostgREST/Realtime, and RLS policies pick up
// the Clerk claims via `auth.jwt() ->> 'sub'`.
//
// Prereq: in the Supabase dashboard, Authentication → Providers → Third-Party
// must have Clerk enabled (provide your Clerk Frontend API URL).
// ─────────────────────────────────────────────────────────────────────────────
export function useSupabaseBrowser(): SupabaseClient {
  const { getToken } = useAuth()

  return useMemo(
    () =>
      createBrowserClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          // Clerk's getToken is browser-only; during SSR of this client
          // component, return null so Supabase treats the request as anon.
          // Once hydrated, the callback re-runs with a real session token.
          accessToken: async () => {
            if (typeof window === "undefined") return null
            return (await getToken()) ?? null
          },
        },
      ),
    [getToken],
  )
}

// Singleton fallback for non-React contexts (e.g. realtime utility modules
// that need a client outside a component). Anonymous — no Clerk token, so
// only public data is reachable.
let anonClient: SupabaseClient | null = null
export function createAnonBrowserClient(): SupabaseClient {
  if (anonClient) return anonClient
  anonClient = createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
  return anonClient
}
