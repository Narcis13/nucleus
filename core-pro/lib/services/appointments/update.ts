import "server-only"

import { updateAppointment as updateAppointmentQuery } from "@/lib/db/queries/appointments"
import { evaluateTrigger } from "@/lib/automations/engine"
import { scheduleAppointmentReminders } from "@/lib/scheduling/notifications"
import type { Appointment } from "@/types/domain"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError } from "../_lib/errors"

export type UpdateAppointmentInput = {
  id: string
  title?: string
  clientId?: string | null
  serviceId?: string | null
  description?: string | null
  startAt?: string
  endAt?: string
  type?: "in_person" | "virtual" | "phone"
  status?:
    | "scheduled"
    | "confirmed"
    | "pending"
    | "completed"
    | "cancelled"
    | "no_show"
  location?: string | null
  notes?: string | null
}

export type UpdateAppointmentResult = { appointment: Appointment }

export async function updateAppointment(
  _ctx: ServiceContext,
  input: UpdateAppointmentInput,
): Promise<UpdateAppointmentResult> {
  const { id, startAt, endAt, ...rest } = input
  const patch: Record<string, unknown> = { ...rest }
  if (startAt) patch.startAt = new Date(startAt)
  if (endAt) patch.endAt = new Date(endAt)

  const updated = await updateAppointmentQuery(id, patch as never)
  if (!updated) throw new NotFoundError("Appointment not found.")

  if (startAt || endAt) {
    void scheduleAppointmentReminders(id).catch(() => {})
  }

  if (input.status === "completed") {
    void evaluateTrigger("appointment_completed", {
      type: "appointment_completed",
      professionalId: updated.professionalId,
      clientId: updated.clientId ?? null,
      appointmentId: updated.id,
    }).catch(() => {})
  }

  return { appointment: updated }
}
