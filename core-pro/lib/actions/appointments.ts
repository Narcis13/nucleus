"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  ActionError,
  authedAction,
  publicAction,
} from "@/lib/actions/safe-action"
import {
  cancelAppointment as cancelAppointmentQuery,
  createAppointment as createAppointmentQuery,
  createPublicBooking,
  getAvailableSlotsPublic,
  replaceAvailability,
  setCalendarBufferMinutes,
  updateAppointment as updateAppointmentQuery,
} from "@/lib/db/queries/appointments"
import { getProfessional } from "@/lib/db/queries/professionals"
import { evaluateTrigger } from "@/lib/automations/engine"
import { sendAppointmentEmails, scheduleAppointmentReminders } from "@/lib/scheduling/notifications"

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────
const createSchema = z.object({
  clientId: z.string().uuid().nullable().optional(),
  serviceId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  type: z.enum(["in_person", "virtual", "phone"]).default("in_person"),
  status: z
    .enum(["scheduled", "confirmed", "pending", "completed", "cancelled", "no_show"])
    .default("scheduled"),
  location: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  clientId: z.string().uuid().nullable().optional(),
  serviceId: z.string().uuid().nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  type: z.enum(["in_person", "virtual", "phone"]).optional(),
  status: z
    .enum(["scheduled", "confirmed", "pending", "completed", "cancelled", "no_show"])
    .optional(),
  location: z.string().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

const cancelSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().max(500).optional(),
})

const availabilitySchema = z.object({
  bufferMinutes: z.number().int().min(0).max(240),
  slots: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        isActive: z.boolean(),
      }),
    )
    .max(50),
})

const bookingSchema = z.object({
  professionalId: z.string().uuid(),
  serviceId: z.string().uuid().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  guestName: z.string().min(1).max(200),
  guestEmail: z.string().email(),
  guestPhone: z.string().max(40).optional(),
  notes: z.string().max(2000).optional(),
})

const slotsQuerySchema = z.object({
  professionalId: z.string().uuid(),
  from: z.string().datetime(),
  to: z.string().datetime(),
  slotMinutes: z.number().int().min(5).max(240).optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────
export const createAppointmentAction = authedAction
  .metadata({ actionName: "appointments.create" })
  .inputSchema(createSchema)
  .action(async ({ parsedInput }) => {
    const professional = await getProfessional()
    if (!professional) throw new ActionError("Unauthorized")

    const startAt = new Date(parsedInput.startAt)
    const endAt = new Date(parsedInput.endAt)
    if (endAt <= startAt) {
      throw new ActionError("End time must be after start time.")
    }

    const created = await createAppointmentQuery(
      {
        clientId: parsedInput.clientId ?? null,
        serviceId: parsedInput.serviceId ?? null,
        title: parsedInput.title,
        description: parsedInput.description ?? null,
        startAt,
        endAt,
        type: parsedInput.type,
        status: parsedInput.status,
        location: parsedInput.location ?? null,
        notes: parsedInput.notes ?? null,
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

    revalidatePath("/dashboard/calendar")
    return { id: created.id }
  })

export const updateAppointmentAction = authedAction
  .metadata({ actionName: "appointments.update" })
  .inputSchema(updateSchema)
  .action(async ({ parsedInput }) => {
    const { id, startAt, endAt, ...rest } = parsedInput
    const patch: Record<string, unknown> = { ...rest }
    if (startAt) patch.startAt = new Date(startAt)
    if (endAt) patch.endAt = new Date(endAt)

    const updated = await updateAppointmentQuery(id, patch as never)
    if (!updated) throw new ActionError("Appointment not found.")

    if (startAt || endAt) {
      void scheduleAppointmentReminders(id).catch(() => {})
    }

    if (parsedInput.status === "completed") {
      void evaluateTrigger("appointment_completed", {
        type: "appointment_completed",
        professionalId: updated.professionalId,
        clientId: updated.clientId ?? null,
        appointmentId: updated.id,
      }).catch(() => {})
    }

    revalidatePath("/dashboard/calendar")
    return { id: updated.id }
  })

export const cancelAppointmentAction = authedAction
  .metadata({ actionName: "appointments.cancel" })
  .inputSchema(cancelSchema)
  .action(async ({ parsedInput }) => {
    const cancelled = await cancelAppointmentQuery(parsedInput.id, parsedInput.reason)
    if (!cancelled) throw new ActionError("Appointment not found.")
    void sendAppointmentEmails({
      appointmentId: parsedInput.id,
      kind: "cancellation",
    }).catch(() => {})
    revalidatePath("/dashboard/calendar")
    return { id: cancelled.id }
  })

export const saveAvailabilityAction = authedAction
  .metadata({ actionName: "appointments.saveAvailability" })
  .inputSchema(availabilitySchema)
  .action(async ({ parsedInput }) => {
    const professional = await getProfessional()
    if (!professional) throw new ActionError("Unauthorized")

    // Reject overlapping windows on the same day so the slot generator never
    // double-counts a working hour.
    const byDay = new Map<number, Array<{ start: string; end: string }>>()
    for (const s of parsedInput.slots) {
      if (s.endTime <= s.startTime) {
        throw new ActionError("End time must be after start time.")
      }
      const list = byDay.get(s.dayOfWeek) ?? []
      list.push({ start: s.startTime, end: s.endTime })
      byDay.set(s.dayOfWeek, list)
    }
    for (const [, list] of byDay) {
      list.sort((a, b) => (a.start < b.start ? -1 : 1))
      for (let i = 1; i < list.length; i++) {
        if (list[i]!.start < list[i - 1]!.end) {
          throw new ActionError("Availability windows must not overlap.")
        }
      }
    }

    await replaceAvailability(professional.id, parsedInput.slots)
    await setCalendarBufferMinutes(professional.id, parsedInput.bufferMinutes)

    revalidatePath("/dashboard/calendar")
    revalidatePath("/dashboard/settings")
    return { ok: true }
  })

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC actions — used by the booking widget on the micro-site.
// `publicAction` does not require auth; ratelimited per IP/user.
// ─────────────────────────────────────────────────────────────────────────────
export const getAvailableSlotsAction = publicAction
  .metadata({ actionName: "appointments.availableSlots" })
  .inputSchema(slotsQuerySchema)
  .action(async ({ parsedInput }) => {
    const slots = await getAvailableSlotsPublic({
      professionalId: parsedInput.professionalId,
      from: new Date(parsedInput.from),
      to: new Date(parsedInput.to),
      slotMinutes: parsedInput.slotMinutes,
    })
    // Stringify dates for the wire so the client can hydrate them with a
    // known shape (RSC + server actions both handle Date, but the booking
    // widget might be called from outside a Next route).
    return {
      slots: slots.map((s) => ({
        start: s.start.toISOString(),
        end: s.end.toISOString(),
      })),
    }
  })

export const createBookingAction = publicAction
  .metadata({ actionName: "appointments.book" })
  .inputSchema(bookingSchema)
  .action(async ({ parsedInput }) => {
    const startAt = new Date(parsedInput.startAt)
    const endAt = new Date(parsedInput.endAt)
    if (endAt <= startAt) {
      throw new ActionError("End time must be after start time.")
    }
    const created = await createPublicBooking({
      professionalId: parsedInput.professionalId,
      serviceId: parsedInput.serviceId ?? null,
      startAt,
      endAt,
      guestName: parsedInput.guestName,
      guestEmail: parsedInput.guestEmail,
      guestPhone: parsedInput.guestPhone ?? null,
      notes: parsedInput.notes ?? null,
    })
    void sendAppointmentEmails({
      appointmentId: created.id,
      kind: "confirmation",
    }).catch(() => {})
    return { id: created.id }
  })
