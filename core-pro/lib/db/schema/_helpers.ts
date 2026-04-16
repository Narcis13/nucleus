import { sql } from "drizzle-orm"
import { timestamp } from "drizzle-orm/pg-core"

// ── Standard timestamp columns ──────────────────────────────────────────────
// Factories (not shared instances) so each call to pgTable receives its own
// column builder — avoids Drizzle's shared-builder state pitfalls.
// updated_at rows are kept fresh by trigger_set_timestamp() (see 9903_triggers.sql).
export const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull()

export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()

// ── Clerk JWT claim accessors ──────────────────────────────────────────────
// Wrapped in (select ...) so Postgres caches the result per-statement (see
// Supabase "RLS optimization" guide). Use these in pgPolicy `using` / `withCheck`.
export const currentClerkUserId = sql`(select auth.jwt() ->> 'sub')`
export const currentClerkOrgId = sql`(select auth.jwt() ->> 'org_id')`

// Resolves the currently-authenticated professional's id from their Clerk sub.
// Use in policies for any table with a `professional_id` column.
export const currentProfessionalIdSql = sql`(select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))`

// Resolves the currently-authenticated client's id from their Clerk sub.
export const currentClientIdSql = sql`(select id from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub'))`
