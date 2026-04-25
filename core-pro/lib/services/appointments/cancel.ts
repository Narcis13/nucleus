import "server-only"

import { cancelAppointment as cancelAppointmentQuery } from "@/lib/db/queries/appointments"
import { sendAppointmentEmails } from "@/lib/scheduling/notifications"
import type { Appointment } from "@/types/domain"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError } from "../_lib/errors"

export type CancelAppointmentInput = {
  id: string
  reason?: string
}

export type CancelAppointmentResult = { appointment: Appointment }

export async function cancelAppointment(
  _ctx: ServiceContext,
  input: CancelAppointmentInput,
): Promise<CancelAppointmentResult> {
  const cancelled = await cancelAppointmentQuery(input.id, input.reason)
  if (!cancelled) throw new NotFoundError("Appointment not found.")
  void sendAppointmentEmails({
    appointmentId: input.id,
    kind: "cancellation",
  }).catch(() => {})
  return { appointment: cancelled }
}
