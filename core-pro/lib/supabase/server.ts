import "server-only"

import { auth } from "@clerk/nextjs/server"
import { createServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

import { env } from "@/lib/env"

// ─────────────────────────────────────────────────────────────────────────────
// Server Supabase client — RSC, Server Actions, Route Handlers.
//
// Used for Storage signed URLs and any server-side Supabase operation that
// must respect RLS. Database queries should generally go through Drizzle
// (`db` + `withRLS`) — this client is here for the parts that genuinely need
// the Supabase SDK (Storage, Realtime channels created server-side).
//
// Auth: Clerk Third-Party Auth via `accessToken` callback. NOT the deprecated
// JWT template. Cookies are read for any Supabase-managed session state, but
// the actual identity comes from Clerk's token.
// ─────────────────────────────────────────────────────────────────────────────
export async function createSupabaseServer(): Promise<SupabaseClient> {
  const cookieStore = await cookies()
  const { getToken } = await auth()

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // RSC contexts can't mutate cookies — middleware refreshes them.
          }
        },
      },
      accessToken: async () => (await getToken()) ?? null,
    },
  )
}
