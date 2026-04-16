import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { dbAdmin } from "@/lib/db/client"
import { professionals } from "@/lib/db/schema"
import type { Branding } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/branding/[professional_id]
//
// Public endpoint — returns the non-sensitive branding config (colors, font,
// logo, display name) for a professional. Used by:
//   • The client portal shell, to render the right colors/logo even before
//     Clerk's org metadata is hydrated client-side.
//   • Public flows (micro-site preview, invite landing pages) that don't have
//     a signed-in session.
//
// Intentionally uses `dbAdmin` — RLS on `professionals` restricts SELECTs to
// the professional's own row, but branding is public by design so we bypass
// that policy for this endpoint only. We return a small, fixed shape so no
// sensitive columns leak if the schema grows later.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type BrandingResponse = {
  id: string
  name: string
  avatarUrl: string | null
  branding: Branding | null
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ professional_id: string }> },
) {
  const { professional_id } = await params

  // Validate before hitting the DB so a trivially malformed id doesn't
  // trigger an `invalid_input_syntax_for_type_uuid` Postgres error.
  if (!UUID_RE.test(professional_id)) {
    return NextResponse.json(
      { error: "Invalid professional_id" },
      { status: 400 },
    )
  }

  const rows = await dbAdmin
    .select({
      id: professionals.id,
      fullName: professionals.fullName,
      avatarUrl: professionals.avatarUrl,
      branding: professionals.branding,
    })
    .from(professionals)
    .where(eq(professionals.id, professional_id))
    .limit(1)

  const row = rows[0]
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body: BrandingResponse = {
    id: row.id,
    name: row.fullName,
    avatarUrl: row.avatarUrl,
    branding: (row.branding ?? null) as Branding | null,
  }

  return NextResponse.json(body, {
    headers: {
      // Branding rarely changes — let shared proxies cache briefly. The SWR
      // tail keeps the portal snappy while a background refresh happens.
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
    },
  })
}
