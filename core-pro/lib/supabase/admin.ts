import "server-only"

import { createClient } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"

import { env } from "@/lib/env"

// ─────────────────────────────────────────────────────────────────────────────
// Service-role Supabase client — webhooks, cron, Storage admin ops.
//
// BYPASSES RLS. Never import from a browser bundle, RSC, or any user-facing
// Server Action. The service-role key has unrestricted access to every row in
// the database and every object in Storage.
//
// Lazy singleton so we don't pay for a client that never gets used in a given
// process (e.g. RSC-only routes).
// ─────────────────────────────────────────────────────────────────────────────
let cached: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached
  cached = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  )
  return cached
}
