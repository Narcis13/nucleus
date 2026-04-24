import { NextResponse, type NextRequest } from "next/server"

import { env } from "@/lib/env"
import { runOverdueChecker } from "@/lib/invoices/overdue-checker"

// ─────────────────────────────────────────────────────────────────────────────
// Manual / external cron entry for the invoice overdue sweep.
//
// Primary scheduler is `trigger/jobs/invoices.ts` (Trigger.dev). This route
// is a catch-up backup so Vercel Cron or any GET-based scheduler can drive
// the same sweep. Protected by the CRON_SECRET header (Vercel Cron standard).
// Accepts GET (cron conventions) and POST (manual ops re-runs).
// ─────────────────────────────────────────────────────────────────────────────

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  // Local dev has no CRON_SECRET configured — allow so developers can hit the
  // route from the browser. Any non-empty secret must match the header.
  if (!secret || env.NODE_ENV !== "production") return true
  const header =
    req.headers.get("authorization") ??
    req.headers.get("x-cron-secret") ??
    ""
  return header === `Bearer ${secret}` || header === secret
}

async function handle(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) return unauthorized()
  try {
    const report = await runOverdueChecker()
    return NextResponse.json({ ok: true, ...report })
  } catch (err) {
    console.error(err, { tags: { cron: "invoices-overdue" } })
    return NextResponse.json(
      { ok: false, error: "Sweep failed" },
      { status: 500 },
    )
  }
}

export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}
