import "server-only"

import { createHash, randomBytes } from "node:crypto"

import { dbAdmin } from "@/lib/db/client"
import { portalInvites } from "@/lib/db/schema"
import { env } from "@/lib/env"

// 15 minutes — short enough that a leaked link is cold quickly, long enough
// that the recipient can find the email and click before it expires.
const INVITE_TTL_MS = 15 * 60 * 1000

export type IssuePortalMagicLinkInput = {
  clientId: string
  professionalId: string
}

export type IssuePortalMagicLinkResult = {
  inviteId: string
  url: string
  expiresAt: Date
}

// ─────────────────────────────────────────────────────────────────────────────
// issuePortalMagicLink
//
// Mints a single-use magic-link ticket for a client portal session. Writes
// `sha256(token)` (not the raw token) to `portal_invites.token_hash` so a DB
// dump can't be replayed. Returns a fully-formed verify URL the caller emails
// (or otherwise delivers) to the client.
//
// Uses `dbAdmin` because `portal_invites` has RLS enabled with no permissive
// policy — only the service-role connection can insert.
// ─────────────────────────────────────────────────────────────────────────────
export async function issuePortalMagicLink(
  input: IssuePortalMagicLinkInput,
): Promise<IssuePortalMagicLinkResult> {
  const rawToken = randomBytes(32).toString("base64url")
  const tokenHash = createHash("sha256").update(rawToken).digest()
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS)

  const [row] = await dbAdmin
    .insert(portalInvites)
    .values({
      clientId: input.clientId,
      professionalId: input.professionalId,
      tokenHash,
      expiresAt,
    })
    .returning({ id: portalInvites.id })

  const url = new URL("/portal/verify", env.NEXT_PUBLIC_APP_URL)
  url.searchParams.set("token", rawToken)

  return { inviteId: row.id, url: url.toString(), expiresAt }
}
