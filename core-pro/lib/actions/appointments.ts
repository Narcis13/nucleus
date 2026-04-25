"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT — why create/update/cancel return the full Appointment and do NOT
// call `revalidatePath` for the calendar route:
//
// Next 16 + Turbopack racy-RSC bug. When a server action that mutates data
// calls `revalidatePath("/dashboard/calendar")`, the resulting RSC re-stream
// collides with the dialog-close + grid re-render and crashes with
// `initializeDebugInfo` / `enqueueModel`. Same family of bug that forced the
// drag-reschedule action to skip revalidation.
//
// Mitigation: return the full appointment from each action so the calendar
// grid can update its local state optimistically. The AgendaSidebar stays
// stale until the next navigation, which is acceptable for now.
// ─────────────────────────────────────────────────────────────────────────────

import {
  ActionError,
  authedAction,
  publicAction,
} from "@/lib/actions/safe-action"
import { publicFormRateLimit } from "@/lib/ratelimit"
import { cancelAppointment } from "@/lib/services/appointments/cancel"
import { createAppointment } from "@/lib/services/appointments/create"
import { createBooking } from "@/lib/services/appointments/create-booking"
import { getAvailableSlots } from "@/lib/services/appointments/get-available-slots"
import { rescheduleAppointment } from "@/lib/services/appointments/reschedule"
import { saveAvailability } from "@/lib/services/appointments/save-availability"
import { updateAppointment } from "@/lib/services/appointments/update"

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

const rescheduleSchema = z.object({
  id: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
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
  .action(async ({ parsedInput, ctx }) => {
    return createAppointment(ctx, parsedInput)
  })

export const updateAppointmentAction = authedAction
  .metadata({ actionName: "appointments.update" })
  .inputSchema(updateSchema)
  .action(async ({ parsedInput, ctx }) => {
    return updateAppointment(ctx, parsedInput)
  })

// Drag-to-reschedule on the calendar. Deliberately skips `revalidatePath` —
// rapid successive drags otherwise race two RSC payloads in Next 16 and
// crash the page (initializeDebugInfo / enqueueModel). The grid keeps an
// optimistic local copy and re-seeds from the server prop on the next
// non-drag action.
export const rescheduleAppointmentAction = authedAction
  .metadata({ actionName: "appointments.reschedule" })
  .inputSchema(rescheduleSchema)
  .action(async ({ parsedInput, ctx }) => {
    return rescheduleAppointment(ctx, parsedInput)
  })

export const cancelAppointmentAction = authedAction
  .metadata({ actionName: "appointments.cancel" })
  .inputSchema(cancelSchema)
  .action(async ({ parsedInput, ctx }) => {
    return cancelAppointment(ctx, parsedInput)
  })

export const saveAvailabilityAction = authedAction
  .metadata({ actionName: "appointments.saveAvailability" })
  .inputSchema(availabilitySchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await saveAvailability(ctx, parsedInput)
    revalidatePath("/dashboard/calendar")
    revalidatePath("/dashboard/settings")
    return result
  })

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC actions — used by the booking widget on the micro-site.
// `publicAction` does not require auth; ratelimited per IP/user.
// ─────────────────────────────────────────────────────────────────────────────
export const getAvailableSlotsAction = publicAction
  .metadata({ actionName: "appointments.availableSlots" })
  .inputSchema(slotsQuerySchema)
  .action(async ({ parsedInput }) => {
    return getAvailableSlots(parsedInput)
  })

export const createBookingAction = publicAction
  .metadata({ actionName: "appointments.book" })
  .inputSchema(bookingSchema)
  .action(async ({ parsedInput }) => {
    if (publicFormRateLimit) {
      const hdrs = await headers()
      const ip =
        hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        hdrs.get("x-real-ip") ??
        "anonymous"
      const { success } = await publicFormRateLimit.limit(
        `booking:${parsedInput.professionalId}:${ip}`,
      )
      if (!success) {
        throw new ActionError(
          "You're booking too quickly — try again in a minute.",
        )
      }
    }

    return createBooking(parsedInput)
  })
