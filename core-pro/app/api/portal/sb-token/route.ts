import { NextResponse } from "next/server"

import { mintPortalSupabaseJWT } from "@/lib/supabase/portal-jwt"
import { requirePortalSession } from "@/lib/portal-auth/session"

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/portal/sb-token
//
// Mints a short-lived Supabase JWT for the active portal session. The browser
// Supabase client (see `lib/supabase/client.ts`) calls this from its
// `accessToken` callback and caches the result until shortly before expiry.
//
// Trust boundary: the cookie session. `requirePortalSession()` redirects to
// `/portal/sign-in` when the cookie is missing, but redirects on a fetch from
// the Supabase client just become opaque failures, so we explicitly bail
// with 401 here when a session can't be resolved without throwing through.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  // requirePortalSession redirects on miss; for a fetch caller a 401 with a
  // body is friendlier than a 307 to a sign-in page, so we read the cookie
  // through the same path but catch the redirect by checking session presence.
  // The redirect inside requirePortalSession is implemented via Next's
  // `redirect()` which throws a NEXT_REDIRECT error — translate it to 401.
  try {
    const session = await requirePortalSession()
    const minted = mintPortalSupabaseJWT({
      clientId: session.clientId,
      professionalId: session.professionalId,
    })
    return NextResponse.json(
      {
        token: minted.token,
        expiresAt: minted.expiresAt.toISOString(),
      },
      {
        // Token is sensitive — keep it out of any cache.
        headers: { "Cache-Control": "no-store" },
      },
    )
  } catch (error) {
    // Next's `redirect()` throws an object whose `digest` starts with
    // "NEXT_REDIRECT". Anything else is unexpected.
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      return NextResponse.json(
        { error: "unauthenticated" },
        { status: 401 },
      )
    }
    throw error
  }
}
