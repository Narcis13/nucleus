import "server-only"

import { createPublicBooking } from "@/lib/db/queries/appointments"
import { trackServerEvent } from "@/lib/posthog/events"
import { sendAppointmentEmails } from "@/lib/scheduling/notifications"

import { assertEndAfterStart } from "./_helpers"

// Why public: this runs from the unauthenticated booking widget on a
// professional's micro-site. No ServiceContext / withRLS — the underlying
// query uses dbAdmin deliberately because the visitor predates any
// RLS-eligible identity. The {professionalId} is the auth boundary; it is
// resolved server-side from the micro-site slug before reaching this layer.
// Per-IP transport ratelimiting stays in the action shell.

export type CreateBookingInput = {
  professionalId: string
  serviceId?: string
  startAt: string
  endAt: string
  guestName: string
  guestEmail: string
  guestPhone?: string
  notes?: string
}

export type CreateBookingResult = { id: string }

export async function createBooking(
  input: CreateBookingInput,
): Promise<CreateBookingResult> {
  const startAt = new Date(input.startAt)
  const endAt = new Date(input.endAt)
  assertEndAfterStart(startAt, endAt)

  const created = await createPublicBooking({
    professionalId: input.professionalId,
    serviceId: input.serviceId ?? null,
    startAt,
    endAt,
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    guestPhone: input.guestPhone ?? null,
    notes: input.notes ?? null,
  })

  void sendAppointmentEmails({
    appointmentId: created.id,
    kind: "confirmation",
  }).catch(() => {})

  // Public bookings have no Clerk session to anchor the event to — use the
  // professional's id as the distinct id so the funnel aggregates per pro.
  void trackServerEvent("appointment_created", {
    distinctId: input.professionalId,
    professionalId: input.professionalId,
    appointmentId: created.id,
    origin: "public_booking",
    type: "in_person",
  })

  return { id: created.id }
}
