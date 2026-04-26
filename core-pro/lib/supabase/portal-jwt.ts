import "server-only"

import { createHmac } from "node:crypto"

import { env } from "@/lib/env"

// ─────────────────────────────────────────────────────────────────────────────
// Portal Supabase JWT
//
// Mints a short-lived HS256 JWT keyed off the project's `SUPABASE_JWT_SECRET`
// so that Supabase Realtime + Storage accept the bearer for portal clients.
// The cookie session is the trust boundary — this token is just a transport
// for the portal session's claims into Supabase.
//
// **This module is the single chokepoint for `SUPABASE_JWT_SECRET`.** Don't
// import the secret elsewhere; expose helpers here instead.
// ─────────────────────────────────────────────────────────────────────────────

const PORTAL_JWT_TTL_SECONDS = 60 * 60 // 1h — matches plan spec

export type PortalJwtClaims = {
  sub: string
  role: "authenticated"
  aud: "authenticated"
  client_id: string
  professional_id: string
  exp: number
  iat: number
}

export type MintedPortalJwt = {
  token: string
  expiresAt: Date
}

export function mintPortalSupabaseJWT(input: {
  clientId: string
  professionalId: string
}): MintedPortalJwt {
  const issuedAt = Math.floor(Date.now() / 1000)
  const expiresAtSeconds = issuedAt + PORTAL_JWT_TTL_SECONDS

  const header = { alg: "HS256", typ: "JWT" }
  const payload: PortalJwtClaims = {
    sub: `client_${input.clientId}`,
    role: "authenticated",
    aud: "authenticated",
    client_id: input.clientId,
    professional_id: input.professionalId,
    exp: expiresAtSeconds,
    iat: issuedAt,
  }

  const encodedHeader = base64UrlJson(header)
  const encodedPayload = base64UrlJson(payload)
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const signature = createHmac("sha256", env.SUPABASE_JWT_SECRET)
    .update(signingInput)
    .digest("base64url")

  return {
    token: `${signingInput}.${signature}`,
    expiresAt: new Date(expiresAtSeconds * 1000),
  }
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url")
}
