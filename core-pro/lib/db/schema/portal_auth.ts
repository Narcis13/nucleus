import {
  customType,
  index,
  inet,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import { createdAt } from "./_helpers"
import { clients } from "./clients"
import { professionals } from "./professionals"

// Postgres `bytea` mapped to Node Buffer — used for the sha256 of the raw
// magic-link token, so the raw token never lands at rest.
const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea"
  },
})

// ============================================================================
// PORTAL_INVITES — single-use magic-link tickets minted by the agent and
// emailed to the client. The raw token lives only in the email/URL; the DB
// stores `sha256(token)` so a DB leak can't be replayed against the portal.
//
// RLS: enabled, no permissive policy. Only the server (service role + the
// Drizzle direct connection used by `lib/services/portal/*`) ever reads or
// writes these rows.
// ============================================================================
export const portalInvites = pgTable(
  "portal_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id),
    tokenHash: bytea("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("portal_invites_token_hash_idx").on(t.tokenHash)],
).enableRLS()

// ============================================================================
// PORTAL_SESSIONS — opaque session id stored in the client portal cookie.
// 30-day sliding window (refreshed on each request), revocable from the agent
// UI.
//
// RLS: enabled, no permissive policy. Same server-only access rule as
// portal_invites.
// ============================================================================
export const portalSessions = pgTable(
  "portal_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    userAgent: text("user_agent"),
    ip: inet("ip"),
    createdAt: createdAt(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  },
  (t) => [
    index("portal_sessions_client_id_expires_at_idx").on(
      t.clientId,
      t.expiresAt,
    ),
  ],
).enableRLS()
