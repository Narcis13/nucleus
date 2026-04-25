import "server-only"

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { env } from "@/lib/env"

import * as schema from "./schema"

// ─────────────────────────────────────────────────────────────────────────────
// USER-SCOPED CLIENT
//
// Connects on the standard Postgres URL. Queries are RLS-enforced **only when
// wrapped in `withRLS()`** — that helper opens a transaction, sets Clerk JWT
// claims via `set_config()`, and SETs LOCAL ROLE to `authenticated`.
//
// Direct calls to `db.select(...)` outside `withRLS` run as the connecting
// role (typically `postgres` / `authenticator` in production) and bypass RLS,
// so any code reading user-scoped tables MUST go through `withRLS`.
//
// `prepare: false` is required when running through Supabase's transaction
// pooler (PgBouncer in transaction mode does not support prepared statements).
// ─────────────────────────────────────────────────────────────────────────────
const databaseUrl = env.DATABASE_URL
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set — cannot initialise Drizzle client.")
}

// `idle_timeout` recycles connections unused for 20s so a sleeping macOS
// dev box doesn't hand back a dead socket on wake (`EADDRNOTAVAIL` on read).
const sql = postgres(databaseUrl, { prepare: false, idle_timeout: 20 })
export const db = drizzle(sql, { schema, casing: "snake_case" })

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE-ROLE CLIENT
//
// Bypasses RLS entirely. USE ONLY IN: Clerk/Stripe webhooks, cron jobs,
// Trigger.dev tasks, scripts. Never import this from a Server Action or RSC
// that handles a user request — use `db` + `withRLS` instead.
//
// Falls back to DATABASE_URL when DATABASE_URL_SERVICE_ROLE is unset (handy
// in local dev where the postgres superuser already bypasses RLS).
// ─────────────────────────────────────────────────────────────────────────────
const adminUrl = env.DATABASE_URL_SERVICE_ROLE ?? databaseUrl
const adminSql = postgres(adminUrl, { prepare: false, idle_timeout: 20 })
export const dbAdmin = drizzle(adminSql, { schema, casing: "snake_case" })

export type DbClient = typeof db
