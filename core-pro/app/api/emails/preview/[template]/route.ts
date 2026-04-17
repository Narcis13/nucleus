import { auth } from "@clerk/nextjs/server"
import { render } from "@react-email/components"
import { NextResponse } from "next/server"

import { getProfessional } from "@/lib/db/queries/professionals"
import { env } from "@/lib/env"
import { fixtureFor } from "@/lib/resend/fixtures"
import {
  EMAIL_TEMPLATE_IDS,
  TEMPLATES,
  isEmailTemplateId,
} from "@/lib/resend/templates"
import type { Branding } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/emails/preview/[template]
//
// Renders a transactional email template as plain HTML for in-browser preview
// (used by the settings page so professionals can see their branding applied
// to every email type before any goes out for real).
//
// Auth: requires a signed-in professional. We splice their actual branding +
// display name into the fixture so what they see is what their clients
// receive. Anonymous callers get 401 — preview output reveals UI we don't
// otherwise expose publicly and is also relatively expensive to render, so we
// gate it behind a session.
//
// Query params:
//   ?format=html          (default) — full HTML document
//   ?format=text          — plaintext fallback (for accessibility / inspection)
//   ?format=json          — render metadata + subject (no body) for the picker
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ template: string }> },
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { template } = await params
  if (!isEmailTemplateId(template)) {
    return NextResponse.json(
      {
        error: "Unknown template",
        availableTemplates: EMAIL_TEMPLATE_IDS,
      },
      { status: 404 },
    )
  }

  const professional = await getProfessional()
  if (!professional) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const brand = {
    professionalName: professional.fullName,
    branding: (professional.branding ?? null) as Branding | null,
    appUrl: env.NEXT_PUBLIC_APP_URL,
    unsubscribeUrl: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/dashboard/settings/notifications`,
  }

  const data = fixtureFor(template, brand)
  const entry = TEMPLATES[template]

  const url = new URL(req.url)
  const format = url.searchParams.get("format") ?? "html"

  if (format === "json") {
    return NextResponse.json({
      template,
      subject: entry.subject(data as never),
      brand,
    })
  }

  // `render()` returns an HTML string; pass `plainText: true` for the text
  // fallback. Both branches share the same fixture so previews stay aligned.
  const html = await render(entry.render(data as never), {
    plainText: format === "text",
  })

  return new NextResponse(html, {
    headers: {
      "Content-Type":
        format === "text"
          ? "text/plain; charset=utf-8"
          : "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      // Sandbox the preview so any rogue content can't ride the parent
      // session's cookies. The settings UI loads this in an <iframe sandbox>.
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy":
        "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; font-src https: data:;",
    },
  })
}
