import "server-only"

import { createAppointment as createAppointmentQuery } from "@/lib/db/queries/appointments"
import { getProfessional } from "@/lib/db/queries/professionals"
import { trackServerEvent } from "@/lib/posthog/events"
import {
  scheduleAppointmentReminders,
  sendAppointmentEmails,
} from "@/lib/scheduling/notifications"
import type { Appointment } from "@/types/domain"

import type { ServiceContext } from "../_lib/context"
import { UnauthorizedError } from "../_lib/errors"
import { assertEndAfterStart } from "./_helpers"

export type CreateAppointmentInput = {
  clientId?: string | null
  serviceId?: string | null
  title: string
  description?: string | null
  startAt: string
  endAt: string
  type: "in_person" | "virtual" | "phone"
  status:
    | "scheduled"
    | "confirmed"
    | "pending"
    | "completed"
    | "cancelled"
    | "no_show"
  location?: string | null
  notes?: string | null
}

export type CreateAppointmentResult = { appointment: Appointment }

export async function createAppointment(
  _ctx: ServiceContext,
  input: CreateAppointmentInput,
): Promise<CreateAppointmentResult> {
  const professional = await getProfessional()
  if (!professional) throw new UnauthorizedError()

  const startAt = new Date(input.startAt)
  const endAt = new Date(input.endAt)
  assertEndAfterStart(startAt, endAt)

  const created = await createAppointmentQuery(
    {
      clientId: input.clientId ?? null,
      serviceId: input.serviceId ?? null,
      title: input.title,
      description: input.description ?? null,
      startAt,
      endAt,
      type: input.type,
      status: input.status,
      location: input.location ?? null,
      notes: input.notes ?? null,
    },
    professional.id,
  )

  // Best-effort: send confirmation email + schedule reminders. We don't
  // fail the action if Resend / Trigger.dev is unreachable — the appointment
  // is the source of truth and cron-style backfill can re-send later.
  void sendAppointmentEmails({
    appointmentId: created.id,
    kind: "confirmation",
  }).catch(() => {})
  void scheduleAppointmentReminders(created.id).catch(() => {})

  void trackServerEvent("appointment_created", {
    distinctId: professional.clerkUserId,
    professionalId: professional.id,
    plan: professional.plan,
    appointmentId: created.id,
    origin: "professional",
    type: input.type,
  })

  return { appointment: created }
}
