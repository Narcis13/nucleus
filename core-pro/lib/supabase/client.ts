"use client"

import { useAuth } from "@clerk/nextjs"
import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { useMemo } from "react"

import { env } from "@/lib/env"

import { useIsPortalSupabaseContext } from "./portal-context"

// ─────────────────────────────────────────────────────────────────────────────
// Browser Supabase client — Realtime, Storage, client-side reads.
//
// Auth integration is split by surface:
//
//   • Agent (dashboard) — Clerk's **native Third-Party Auth** (NOT the
//     deprecated `getToken({ template: "supabase" })` JWT template). The
//     `accessToken` callback hands back Clerk's session token; Supabase
//     forwards it to PostgREST/Realtime, RLS reads `auth.jwt() ->> 'sub'`.
//
//   • Portal — the client portal has no Clerk session. The portal layout
//     wraps its subtree in `<PortalSupabaseAuthProvider>`; this hook detects
//     that context and instead fetches a short-lived JWT from
//     `POST /api/portal/sb-token`. The route mints an HS256 token signed by
//     `SUPABASE_JWT_SECRET` containing `sub=client_<id>`, `client_id`, and
//     `professional_id` claims that RLS keys off.
//
// Prereqs:
//   - Supabase dashboard → Authentication → Providers → Third-Party has Clerk
//     enabled (for the agent path).
//   - The Supabase project's JWT secret is set as `SUPABASE_JWT_SECRET`
//     (for the portal path).
// ─────────────────────────────────────────────────────────────────────────────

// Refresh window: re-fetch a portal token this many seconds before expiry so
// long-running pages don't get caught with an expired JWT in flight.
const PORTAL_TOKEN_REFRESH_LEEWAY_SECONDS = 60

// Module-level cache so every component that calls `useSupabaseBrowser`
// inside the portal subtree shares one in-flight token request.
type PortalTokenCacheEntry = { token: string; expiresAtMs: number }
let portalTokenCache: PortalTokenCacheEntry | null = null
let portalTokenInflight: Promise<PortalTokenCacheEntry> | null = null

async function fetchPortalSupabaseToken(): Promise<PortalTokenCacheEntry> {
  const res = await fetch("/api/portal/sb-token", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`portal sb-token request failed: ${res.status}`)
  }
  const body = (await res.json()) as { token: string; expiresAt: string }
  return {
    token: body.token,
    expiresAtMs: new Date(body.expiresAt).getTime(),
  }
}

async function getPortalSupabaseToken(): Promise<string | null> {
  const now = Date.now()
  const refreshAt =
    (portalTokenCache?.expiresAtMs ?? 0) -
    PORTAL_TOKEN_REFRESH_LEEWAY_SECONDS * 1000
  if (portalTokenCache && now < refreshAt) {
    return portalTokenCache.token
  }
  if (!portalTokenInflight) {
    portalTokenInflight = fetchPortalSupabaseToken()
      .then((entry) => {
        portalTokenCache = entry
        return entry
      })
      .finally(() => {
        portalTokenInflight = null
      })
  }
  try {
    const entry = await portalTokenInflight
    return entry.token
  } catch {
    // If minting fails (e.g. session expired), fall back to anon — the
    // server-rendered content still works, only Realtime/Storage degrade.
    return null
  }
}

export function useSupabaseBrowser(): SupabaseClient {
  const { getToken } = useAuth()
  const isPortal = useIsPortalSupabaseContext()

  return useMemo(
    () =>
      createBrowserClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          accessToken: async () => {
            // SSR pass for either branch — neither Clerk's getToken nor a
            // browser fetch can run server-side, so return null and let the
            // post-hydration re-run pick up the real token.
            if (typeof window === "undefined") return null
            if (isPortal) return await getPortalSupabaseToken()
            return (await getToken()) ?? null
          },
        },
      ),
    [getToken, isPortal],
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
