import "server-only"

import { and, eq, gt, isNull, sql } from "drizzle-orm"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { dbAdmin } from "@/lib/db/client"
import {
  portalSessions,
  professionalClients,
} from "@/lib/db/schema"

import {
  PORTAL_COOKIE_NAME,
  parsePortalCookie,
  portalCookieAttributes,
  signPortalCookie,
} from "./cookie"

// 30 days — same as the cookie. The `expires_at` column is the source of truth;
// the cookie's Max-Age is just a hint to the browser.
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

// Debounce for `last_seen_at` writes inside `requirePortalSession`. Without it
// every page load would write to the DB; 5 minutes is a reasonable trade-off
// between session-revoke responsiveness and write volume.
const LAST_SEEN_DEBOUNCE_MS = 5 * 60 * 1000

export type PortalSession = {
  sessionId: string
  clientId: string
  professionalId: string
}

// ─────────────────────────────────────────────────────────────────────────────
// createSession
//
// Inserts a `portal_sessions` row and returns the signed cookie value the
// caller should write to the response. `dbAdmin` because RLS on
// portal_sessions is locked down to the server.
// ─────────────────────────────────────────────────────────────────────────────
export async function createSession(input: {
  clientId: string
  userAgent?: string | null
  ip?: string | null
}): Promise<{ sessionId: string; cookieValue: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  const [row] = await dbAdmin
    .insert(portalSessions)
    .values({
      clientId: input.clientId,
      expiresAt,
      userAgent: input.userAgent ?? null,
      ip: input.ip ?? null,
      lastSeenAt: new Date(),
    })
    .returning({ id: portalSessions.id })

  return {
    sessionId: row.id,
    cookieValue: signPortalCookie(row.id),
    expiresAt,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// readSession
//
// Resolves the cookie value to the active client + professional. Returns null
// for missing / tampered / expired / revoked sessions. Joins `professional_clients`
// to recover the active professional for the client (single active row in
// practice; we take the first match if multiple exist).
// ─────────────────────────────────────────────────────────────────────────────
export async function readSession(
  cookieValue: string | undefined | null,
): Promise<PortalSession | null> {
  const sessionId = parsePortalCookie(cookieValue)
  if (!sessionId) return null

  const rows = await dbAdmin
    .select({
      sessionId: portalSessions.id,
      clientId: portalSessions.clientId,
      lastSeenAt: portalSessions.lastSeenAt,
      professionalId: professionalClients.professionalId,
    })
    .from(portalSessions)
    .leftJoin(
      professionalClients,
      and(
        eq(professionalClients.clientId, portalSessions.clientId),
        eq(professionalClients.status, "active"),
      ),
    )
    .where(
      and(
        eq(portalSessions.id, sessionId),
        isNull(portalSessions.revokedAt),
        gt(portalSessions.expiresAt, sql`now()`),
      ),
    )
    .limit(1)

  const row = rows[0]
  if (!row || !row.professionalId) return null

  // Sliding-window touch: only write if last_seen_at is older than the
  // debounce window, to avoid hammering the DB on every RSC render.
  const lastSeen = row.lastSeenAt ? row.lastSeenAt.getTime() : 0
  if (Date.now() - lastSeen > LAST_SEEN_DEBOUNCE_MS) {
    void dbAdmin
      .update(portalSessions)
      .set({
        lastSeenAt: new Date(),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      })
      .where(eq(portalSessions.id, row.sessionId))
      .catch(() => {})
  }

  return {
    sessionId: row.sessionId,
    clientId: row.clientId,
    professionalId: row.professionalId,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// revokeSession
//
// Marks a single session row revoked. Idempotent — re-revoking is a no-op
// because we filter on `revoked_at IS NULL`.
// ─────────────────────────────────────────────────────────────────────────────
export async function revokeSession(sessionId: string): Promise<void> {
  await dbAdmin
    .update(portalSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(portalSessions.id, sessionId), isNull(portalSessions.revokedAt)),
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// requirePortalSession
//
// Gate for Server Components / Server Actions inside the portal. Reads the
// cookie, validates the session, and either returns the resolved
// {clientId, professionalId, sessionId} or redirects to the sign-in page.
// `redirect()` throws, so the return type narrows cleanly at call sites.
// ─────────────────────────────────────────────────────────────────────────────
export async function requirePortalSession(): Promise<PortalSession> {
  const cookieStore = await cookies()
  const value = cookieStore.get(PORTAL_COOKIE_NAME)?.value
  const session = await readSession(value)
  if (!session) {
    redirect("/portal/sign-in")
  }
  return session
}

// Re-export cookie helpers so route handlers and the verify endpoint can set
// the cookie without importing the lower-level module directly.
export { PORTAL_COOKIE_NAME, portalCookieAttributes }
