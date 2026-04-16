import "server-only"

import { createEvent, createEvents, type EventAttributes } from "ics"

import { env } from "@/lib/env"
import type { Appointment } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// iCal helpers — wrap the `ics` package so callers don't have to know about
// the [Y, M, D, H, m] tuple shape it expects.
//
// Two shapes:
//   • `appointmentToInvite` → single VEVENT, used as a Resend attachment
//   • `appointmentsToFeed`  → full VCALENDAR document, served from the
//     `/api/calendar/[professional_id]/ical/route.ts` subscription URL
// ─────────────────────────────────────────────────────────────────────────────

function dateTuple(date: Date): [number, number, number, number, number] {
  return [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
  ]
}

function appointmentToEvent(
  appt: Appointment,
  ownerEmail: string,
  ownerName: string,
): EventAttributes {
  const start = new Date(appt.startAt)
  const end = new Date(appt.endAt)
  return {
    uid: `${appt.id}@${new URL(env.NEXT_PUBLIC_APP_URL).host}`,
    title: appt.title,
    description: appt.description ?? undefined,
    location: appt.location ?? undefined,
    start: dateTuple(start),
    startInputType: "utc",
    end: dateTuple(end),
    endInputType: "utc",
    status:
      appt.status === "cancelled"
        ? "CANCELLED"
        : appt.status === "confirmed"
          ? "CONFIRMED"
          : "TENTATIVE",
    organizer: { name: ownerName, email: ownerEmail },
    productId: env.NEXT_PUBLIC_APP_NAME,
    calName: `${ownerName} · Appointments`,
    method: "PUBLISH",
  }
}

export function appointmentToInvite(
  appt: Appointment,
  ownerEmail: string,
  ownerName: string,
): { value: string; error: Error | undefined } {
  const event = appointmentToEvent(appt, ownerEmail, ownerName)
  const { error, value } = createEvent(event)
  return { value: value ?? "", error: error ?? undefined }
}

export function appointmentsToFeed(
  appts: Appointment[],
  ownerEmail: string,
  ownerName: string,
): { value: string; error: Error | undefined } {
  if (appts.length === 0) {
    // `createEvents` rejects an empty array; emit a minimal valid feed instead.
    return {
      value: [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        `PRODID:-//${env.NEXT_PUBLIC_APP_NAME}//Calendar//EN`,
        `X-WR-CALNAME:${ownerName} · Appointments`,
        "END:VCALENDAR",
        "",
      ].join("\r\n"),
      error: undefined,
    }
  }
  const events = appts.map((a) => appointmentToEvent(a, ownerEmail, ownerName))
  const { error, value } = createEvents(events)
  return { value: value ?? "", error: error ?? undefined }
}
