import { createHash } from "node:crypto"

import { and, eq, gt, isNull, sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { dbAdmin } from "@/lib/db/client"
import { env } from "@/lib/env"
import { portalInvites } from "@/lib/db/schema"
import {
  PORTAL_COOKIE_NAME,
  createSession,
  portalCookieAttributes,
} from "@/lib/portal-auth/session"

// crypto.* needs the Node runtime — the route also writes via Drizzle/postgres
// which is incompatible with the Edge runtime.
export const runtime = "nodejs"

// `/portal/verify?token=<raw>`
//
// Single-use redemption of a magic-link invite. On success we drop the
// `nucleus_portal` cookie and bounce to `/portal`. Any failure (missing,
// expired, already used, malformed) lands the user on
// `/portal/sign-in?error=expired|invalid` so they can request a fresh link.
//
// Concurrency: the consume step is a conditional UPDATE
// (`WHERE used_at IS NULL`) with RETURNING. If two requests race the same
// token, exactly one row is returned to one of them; the other gets nothing
// and we treat it as `error=expired`.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")
  if (!token) return redirectToSignIn(req, "invalid")

  const tokenHash = createHash("sha256").update(token).digest()

  const consumed = await dbAdmin
    .update(portalInvites)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(portalInvites.tokenHash, tokenHash),
        isNull(portalInvites.usedAt),
        gt(portalInvites.expiresAt, sql`now()`),
      ),
    )
    .returning({
      clientId: portalInvites.clientId,
      professionalId: portalInvites.professionalId,
    })

  const invite = consumed[0]
  if (!invite) return redirectToSignIn(req, "expired")

  const userAgent = req.headers.get("user-agent")
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null

  const { cookieValue } = await createSession({
    clientId: invite.clientId,
    userAgent,
    ip,
  })

  const target = new URL("/portal", env.NEXT_PUBLIC_APP_URL)
  const res = NextResponse.redirect(target, { status: 303 })
  res.cookies.set(PORTAL_COOKIE_NAME, cookieValue, portalCookieAttributes())
  return res
}

function redirectToSignIn(req: NextRequest, error: "expired" | "invalid") {
  const url = new URL("/portal/sign-in", req.nextUrl.origin)
  url.searchParams.set("error", error)
  return NextResponse.redirect(url, { status: 303 })
}
