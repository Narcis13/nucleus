import "server-only"

import {
  getAppointment,
  updateAppointment as updateAppointmentQuery,
} from "@/lib/db/queries/appointments"
import { scheduleAppointmentReminders } from "@/lib/scheduling/notifications"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError, ServiceError } from "../_lib/errors"
import { assertEndAfterStart } from "./_helpers"

export type RescheduleAppointmentInput = {
  id: string
  startAt: string
  endAt: string
}

export type RescheduleAppointmentResult = { id: string }

export async function rescheduleAppointment(
  _ctx: ServiceContext,
  input: RescheduleAppointmentInput,
): Promise<RescheduleAppointmentResult> {
  const startAt = new Date(input.startAt)
  const endAt = new Date(input.endAt)
  assertEndAfterStart(startAt, endAt)

  const existing = await getAppointment(input.id)
  if (!existing) throw new NotFoundError("Appointment not found.")
  if (existing.appointment.status === "cancelled") {
    throw new ServiceError("Cancelled appointments can't be rescheduled.")
  }

  const updated = await updateAppointmentQuery(input.id, {
    startAt,
    endAt,
  } as never)
  if (!updated) throw new NotFoundError("Appointment not found.")

  void scheduleAppointmentReminders(input.id).catch(() => {})

  return { id: updated.id }
}
