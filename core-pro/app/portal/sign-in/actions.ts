"use server"

import { z } from "zod"

import { publicAction } from "@/lib/actions/safe-action"
import { requestPortalMagicLinkByEmail } from "@/lib/portal-auth/request-link"

const requestPortalLinkSchema = z.object({
  email: z.string().email().max(254),
})

// ─────────────────────────────────────────────────────────────────────────────
// requestPortalLinkAction
//
// Self-service magic-link request. Always succeeds from the caller's POV:
// regardless of whether the email matches a client, the response is a
// generic "if we recognise it, check your inbox". The match-or-miss work
// happens server-side in `requestPortalMagicLinkByEmail`.
//
// Ratelimit comes from two layers:
//   1. middleware → `authRateLimit` keyed by IP on `/portal/sign-in*`.
//   2. `publicAction` → `apiRateLimit` keyed on `action:request-portal-link`.
// ─────────────────────────────────────────────────────────────────────────────
export const requestPortalLinkAction = publicAction
  .metadata({ actionName: "request-portal-link" })
  .inputSchema(requestPortalLinkSchema)
  .action(async ({ parsedInput }) => {
    await requestPortalMagicLinkByEmail({ email: parsedInput.email })
    return { ok: true as const }
  })
