import "server-only"

import {
  createHmac,
  createPrivateKey,
  createSign,
  type KeyObject,
} from "node:crypto"

import { env } from "@/lib/env"

// ─────────────────────────────────────────────────────────────────────────────
// Portal Supabase JWT
//
// Mints a short-lived JWT keyed off the project's JWT signing material so that
// Supabase Realtime + Storage accept the bearer for portal clients. The cookie
// session is the trust boundary — this token is just a transport for the
// portal session's claims into Supabase.
//
// Supports two signing modes, auto-detected from `SUPABASE_JWT_SECRET`:
//   • Legacy symmetric (HS256) — `SUPABASE_JWT_SECRET` is a random string.
//     Project Settings → API → JWT Keys → Legacy JWT Secret.
//   • Asymmetric (RS256 / ES256) — `SUPABASE_JWT_SECRET` is a PEM-encoded
//     private key. Project Settings → API → JWT Keys → "current" signing key.
//     Pair with `SUPABASE_JWT_KID` so Supabase can pick the right public key
//     from JWKS during verification.
//
// **This module is the single chokepoint for the JWT signing secret.** Don't
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

  const payload: PortalJwtClaims = {
    sub: `client_${input.clientId}`,
    role: "authenticated",
    aud: "authenticated",
    client_id: input.clientId,
    professional_id: input.professionalId,
    exp: expiresAtSeconds,
    iat: issuedAt,
  }

  const signer = getSigner()
  const header: Record<string, string> = { alg: signer.alg, typ: "JWT" }
  if (signer.kid) header.kid = signer.kid

  const encodedHeader = base64UrlJson(header)
  const encodedPayload = base64UrlJson(payload)
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const signature = signer.sign(signingInput)

  return {
    token: `${signingInput}.${signature}`,
    expiresAt: new Date(expiresAtSeconds * 1000),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Signer cache — parsing a PEM key on every request is wasteful, and the
// detection result never changes within a process.
// ─────────────────────────────────────────────────────────────────────────────
type Signer = {
  alg: "HS256" | "RS256" | "ES256"
  kid?: string
  sign: (signingInput: string) => string
}

let cachedSigner: Signer | null = null

function getSigner(): Signer {
  if (cachedSigner) return cachedSigner
  const secret = env.SUPABASE_JWT_SECRET
  const kid = process.env.SUPABASE_JWT_KID || undefined

  if (looksLikePem(secret)) {
    const key = createPrivateKey(secret)
    const alg = pickAsymmetricAlg(key)
    cachedSigner = {
      alg,
      kid,
      sign: (input) =>
        createSign(alg === "ES256" ? "SHA256" : "RSA-SHA256")
          .update(input)
          .sign(
            alg === "ES256"
              ? { key, dsaEncoding: "ieee-p1363" }
              : key,
            "base64url",
          ),
    }
    return cachedSigner
  }

  cachedSigner = {
    alg: "HS256",
    sign: (input) =>
      createHmac("sha256", secret).update(input).digest("base64url"),
  }
  return cachedSigner
}

function looksLikePem(value: string): boolean {
  return value.trimStart().startsWith("-----BEGIN")
}

function pickAsymmetricAlg(key: KeyObject): "RS256" | "ES256" {
  // `asymmetricKeyType` is one of: 'rsa', 'rsa-pss', 'ec', 'ed25519', etc.
  // Supabase's asymmetric signing keys are EC P-256 (ES256) or RSA (RS256).
  if (key.asymmetricKeyType === "ec") return "ES256"
  return "RS256"
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url")
}
