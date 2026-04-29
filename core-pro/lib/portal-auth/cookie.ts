import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

import { env } from "@/lib/env"

// ─────────────────────────────────────────────────────────────────────────────
// `nucleus_portal` cookie — opaque session id with an HMAC suffix.
//
// Format: `<sessionId>.<hmac>` where hmac = HMAC-SHA256(sessionId, secret),
// base64url-encoded. The HMAC stops an attacker from probing valid uuids
// (millions of session ids exist) without trivially-cheap dictionary checks
// and lets us reject a malformed cookie without any DB hit.
//
// The session id itself is the `portal_sessions.id` uuid — the cookie is
// just a transport for it, not a JWT. State of truth is the DB row.
// ─────────────────────────────────────────────────────────────────────────────

export const PORTAL_COOKIE_NAME = "nucleus_portal"

// 30 days, in seconds — matches `portal_sessions.expires_at`.
export const PORTAL_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

export type PortalCookieAttributes = {
  httpOnly: true
  secure: boolean
  sameSite: "lax"
  path: "/"
  maxAge: number
}

export function portalCookieAttributes(): PortalCookieAttributes {
  return {
    httpOnly: true,
    // dev tunnels / `next dev` over plain http would drop a `Secure` cookie;
    // gate on NODE_ENV so local dev still works.
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PORTAL_COOKIE_MAX_AGE_SECONDS,
  }
}

// `<sessionId>.<hmac>` — both halves are url-safe so the cookie value never
// needs URL-encoding.
export function signPortalCookie(sessionId: string): string {
  const sig = createHmac("sha256", env.PORTAL_SESSION_SECRET)
    .update(sessionId)
    .digest("base64url")
  return `${sessionId}.${sig}`
}

// Returns the session id when the cookie is well-formed and the HMAC matches.
// `null` for any tampering / missing / malformed input — callers treat that
// as "no session" and redirect to sign-in.
export function parsePortalCookie(value: string | undefined | null): string | null {
  if (!value) return null
  const dot = value.indexOf(".")
  if (dot <= 0 || dot === value.length - 1) return null

  const sessionId = value.slice(0, dot)
  const provided = value.slice(dot + 1)

  const expected = createHmac("sha256", env.PORTAL_SESSION_SECRET)
    .update(sessionId)
    .digest("base64url")

  // timingSafeEqual requires equal-length buffers — bail before comparing
  // when the lengths differ (an attacker controls the provided suffix).
  const a = Buffer.from(expected)
  const b = Buffer.from(provided)
  if (a.length !== b.length) return null
  if (!timingSafeEqual(a, b)) return null
  return sessionId
}
