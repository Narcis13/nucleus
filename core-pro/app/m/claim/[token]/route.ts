import { createHash } from "node:crypto"

import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { claimLeadMagnet } from "@/lib/services/marketing/claim-lead-magnet"

// crypto.* needs the Node runtime; the service writes via Drizzle/postgres
// which is incompatible with the Edge runtime.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// `/m/claim/<rawToken>`
//
// Single-use redemption of a lead-magnet claim. On success we 303-redirect
// to a short-lived signed Supabase URL so the browser downloads the PDF
// directly. Any failure (missing, expired, already used) lands the visitor
// on `/m/claim/expired` with a friendly message.
//
// Concurrency: the service uses a conditional UPDATE on `claimed_at IS NULL`
// with RETURNING — if two clicks race, one consumes, the other gets nothing
// and falls through to the expired path.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  if (!token) return redirectExpired(req)

  const tokenHash = createHash("sha256").update(token).digest()

  try {
    const result = await claimLeadMagnet({ tokenHash })
    if (!result.ok) return redirectExpired(req)
    // The pro's dashboard caches the leads list — invalidate so the new lead
    // shows up next time they navigate. revalidatePath is server-side cache
    // bookkeeping, safe to call from a public route.
    revalidatePath("/dashboard/leads")
    revalidatePath("/dashboard/marketing")
    return NextResponse.redirect(result.url, { status: 303 })
  } catch (err) {
    console.error(err, {
      tags: { action: "marketing.claimLeadMagnet.route" },
    })
    return redirectExpired(req)
  }
}

function redirectExpired(req: NextRequest) {
  const url = new URL("/m/claim/expired", req.nextUrl.origin)
  return NextResponse.redirect(url, { status: 303 })
}
