import {
  getAppointmentsForFeed,
  getProfessionalForBookingPublic,
} from "@/lib/db/queries/appointments"
import { appointmentsToFeed } from "@/lib/scheduling/ical"

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/calendar/[professional_id]/ical
//
// Public iCal subscription URL. Generates an RFC 5545 VCALENDAR document for
// the next 90 days of non-cancelled appointments. Subscribers (Google
// Calendar, Apple Calendar, Outlook) refresh on their own schedule, so we
// allow short s-maxage caching but no client-side max-age.
//
// The {professional_id} path segment is the auth boundary — the URL is
// unguessable (UUID v4) and the caller can rotate the professional id (by
// recreating the row) if it ever leaks. No JSON / API surface is exposed.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ professional_id: string }> },
) {
  const { professional_id } = await params

  if (!UUID_RE.test(professional_id)) {
    return new Response("Invalid professional id", { status: 400 })
  }

  const professional = await getProfessionalForBookingPublic(professional_id)
  if (!professional) {
    return new Response("Not found", { status: 404 })
  }

  const appts = await getAppointmentsForFeed(professional_id)
  const { value, error } = appointmentsToFeed(
    appts,
    professional.email,
    professional.fullName,
  )
  if (error) {
    return new Response(`iCal generation failed: ${error.message}`, {
      status: 500,
    })
  }

  return new Response(value, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${professional.fullName.replace(
        /[^a-z0-9]+/gi,
        "-",
      )}.ics"`,
      "Cache-Control": "public, max-age=0, s-maxage=300",
    },
  })
}
