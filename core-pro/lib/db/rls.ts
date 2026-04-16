import "server-only"

import { auth } from "@clerk/nextjs/server"
import { sql } from "drizzle-orm"
import type { ExtractTablesWithRelations } from "drizzle-orm"
import type { PgTransaction, PgQueryResultHKT } from "drizzle-orm/pg-core"

import { db } from "./client"
import * as schema from "./schema"

// Type alias for the Drizzle transaction handle exposed inside `withRLS`.
// Every Server Action / RSC query must use this `tx` for reads and writes
// so the SET LOCAL session config (Clerk JWT + role) applies to it.
export type Tx = PgTransaction<
  PgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>

export class UnauthenticatedError extends Error {
  constructor(message = "Not authenticated") {
    super(message)
    this.name = "UnauthenticatedError"
  }
}

type Claims = {
  sub: string
  org_id?: string | null
  role: string
}

// ─────────────────────────────────────────────────────────────────────────────
// withRLS
//
// Opens a Drizzle transaction, populates the Clerk JWT claims into the
// `request.jwt.claims` GUC (so `auth.jwt() ->> 'sub'` etc. resolve in policies),
// then SETs LOCAL ROLE to `authenticated` so RLS policies that grant rights to
// `authenticatedRole` actually apply. The transaction commits when `fn`
// resolves, or rolls back on throw.
//
// Pattern adapted from `rphlmr/drizzle-supabase-rls`.
// ─────────────────────────────────────────────────────────────────────────────
export async function withRLS<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const { userId, orgId } = await auth()
  if (!userId) {
    throw new UnauthenticatedError()
  }
  const claims: Claims = {
    sub: userId,
    org_id: orgId ?? null,
    role: "authenticated",
  }
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`,
    )
    await tx.execute(sql`set local role authenticated`)
    return fn(tx as Tx)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// withRLSForClerkUser
//
// Variant for code paths that already have a Clerk userId/orgId in hand
// (webhook handlers acting on behalf of a user, background jobs scoped to a
// professional). Skips the `auth()` call. Still scopes RLS via SET ROLE.
// ─────────────────────────────────────────────────────────────────────────────
export async function withRLSForClerkUser<T>(
  args: { userId: string; orgId?: string | null },
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  const claims: Claims = {
    sub: args.userId,
    org_id: args.orgId ?? null,
    role: "authenticated",
  }
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`,
    )
    await tx.execute(sql`set local role authenticated`)
    return fn(tx as Tx)
  })
}
