import "server-only"

import { and, asc, eq, gte, inArray, lt, lte, ne, or } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { withRLS } from "@/lib/db/rls"
import {
  appointments,
  availabilitySlots,
  clients,
  professionalSettings,
  professionals,
  services,
} from "@/lib/db/schema"
import type {
  Appointment,
  AvailabilitySlot,
  Client,
  NewAppointment,
  Service,
} from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// APPOINTMENTS — RLS-aware reads/writes for the dashboard calendar.
//
// `withRLS` scopes everything to the current professional. Public booking
// flows (booking widget on a micro-site) hit `*Public` variants below that go
// through `dbAdmin` and receive the professional id explicitly — they never
// expose another professional's data because every write is scoped to the
// {professionalId} the public route resolved from the slug.
// ─────────────────────────────────────────────────────────────────────────────

export type AppointmentWithRefs = {
  appointment: Appointment
  client: Pick<Client, "id" | "fullName" | "email" | "avatarUrl"> | null
  service: Pick<Service, "id" | "name" | "durationMinutes"> | null
}

// Returns appointments overlapping the [from, to) range — used by the calendar
// grid. Inclusive on `from`, exclusive on `to` so day boundaries are clean.
export async function getAppointments(
  range: { from: Date; to: Date },
): Promise<AppointmentWithRefs[]> {
  return withRLS(async (tx) => {
    const rows = await tx
      .select({
        appointment: appointments,
        client: {
          id: clients.id,
          fullName: clients.fullName,
          email: clients.email,
          avatarUrl: clients.avatarUrl,
        },
        service: {
          id: services.id,
          name: services.name,
          durationMinutes: services.durationMinutes,
        },
      })
      .from(appointments)
      .leftJoin(clients, eq(clients.id, appointments.clientId))
      .leftJoin(services, eq(services.id, appointments.serviceId))
      .where(
        and(
          gte(appointments.startAt, range.from),
          lt(appointments.startAt, range.to),
        ),
      )
      .orderBy(asc(appointments.startAt))

    return rows.map((r) => ({
      appointment: r.appointment,
      client: r.client?.id ? r.client : null,
      service: r.service?.id ? r.service : null,
    }))
  })
}

export async function getAppointment(
  id: string,
): Promise<AppointmentWithRefs | null> {
  return withRLS(async (tx) => {
    const rows = await tx
      .select({
        appointment: appointments,
        client: {
          id: clients.id,
          fullName: clients.fullName,
          email: clients.email,
          avatarUrl: clients.avatarUrl,
        },
        service: {
          id: services.id,
          name: services.name,
          durationMinutes: services.durationMinutes,
        },
      })
      .from(appointments)
      .leftJoin(clients, eq(clients.id, appointments.clientId))
      .leftJoin(services, eq(services.id, appointments.serviceId))
      .where(eq(appointments.id, id))
      .limit(1)
    const row = rows[0]
    if (!row) return null
    return {
      appointment: row.appointment,
      client: row.client?.id ? row.client : null,
      service: row.service?.id ? row.service : null,
    }
  })
}

export async function getUpcomingAppointments(
  limit = 10,
): Promise<AppointmentWithRefs[]> {
  return withRLS(async (tx) => {
    const rows = await tx
      .select({
        appointment: appointments,
        client: {
          id: clients.id,
          fullName: clients.fullName,
          email: clients.email,
          avatarUrl: clients.avatarUrl,
        },
        service: {
          id: services.id,
          name: services.name,
          durationMinutes: services.durationMinutes,
        },
      })
      .from(appointments)
      .leftJoin(clients, eq(clients.id, appointments.clientId))
      .leftJoin(services, eq(services.id, appointments.serviceId))
      .where(gte(appointments.startAt, new Date()))
      .orderBy(asc(appointments.startAt))
      .limit(limit)
    return rows.map((r) => ({
      appointment: r.appointment,
      client: r.client?.id ? r.client : null,
      service: r.service?.id ? r.service : null,
    }))
  })
}

export async function createAppointment(
  input: Omit<NewAppointment, "id" | "createdAt" | "professionalId">,
  professionalId: string,
): Promise<Appointment> {
  return withRLS(async (tx) => {
    const [created] = await tx
      .insert(appointments)
      .values({ ...input, professionalId })
      .returning()
    if (!created) throw new Error("Failed to create appointment")
    return created
  })
}

export async function updateAppointment(
  id: string,
  patch: Partial<
    Omit<Appointment, "id" | "createdAt" | "professionalId">
  >,
): Promise<Appointment | null> {
  return withRLS(async (tx) => {
    const rows = await tx
      .update(appointments)
      .set(patch)
      .where(eq(appointments.id, id))
      .returning()
    return rows[0] ?? null
  })
}

export async function cancelAppointment(
  id: string,
  reason?: string,
): Promise<Appointment | null> {
  return withRLS(async (tx) => {
    const rows = await tx
      .update(appointments)
      .set({
        status: "cancelled",
        notes: reason ?? null,
      })
      .where(eq(appointments.id, id))
      .returning()
    return rows[0] ?? null
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// AVAILABILITY
// ─────────────────────────────────────────────────────────────────────────────
export async function getAvailabilitySlots(): Promise<AvailabilitySlot[]> {
  return withRLS(async (tx) => {
    return tx
      .select()
      .from(availabilitySlots)
      .orderBy(asc(availabilitySlots.dayOfWeek), asc(availabilitySlots.startTime))
  })
}

// Replace the entire availability config in a single transaction so we never
// leave partial state on a failed save (a half-saved week is worse than none).
export async function replaceAvailability(
  professionalId: string,
  slots: Array<{
    dayOfWeek: number
    startTime: string
    endTime: string
    isActive: boolean
  }>,
): Promise<AvailabilitySlot[]> {
  return withRLS(async (tx) => {
    await tx
      .delete(availabilitySlots)
      .where(eq(availabilitySlots.professionalId, professionalId))
    if (slots.length === 0) return []
    const inserted = await tx
      .insert(availabilitySlots)
      .values(slots.map((s) => ({ ...s, professionalId })))
      .returning()
    return inserted
  })
}

// Gets the buffer-minutes setting from professional_settings.calendar_sync.
// Falls back to 0 when unset.
export async function getCalendarBufferMinutes(): Promise<number> {
  return withRLS(async (tx) => {
    const rows = await tx
      .select({ calendarSync: professionalSettings.calendarSync })
      .from(professionalSettings)
      .limit(1)
    const sync = rows[0]?.calendarSync as
      | { buffer_minutes?: number }
      | null
      | undefined
    return Math.max(0, Number(sync?.buffer_minutes ?? 0)) || 0
  })
}

export async function setCalendarBufferMinutes(
  professionalId: string,
  bufferMinutes: number,
): Promise<void> {
  return withRLS(async (tx) => {
    const rows = await tx
      .select({
        id: professionalSettings.id,
        calendarSync: professionalSettings.calendarSync,
      })
      .from(professionalSettings)
      .where(eq(professionalSettings.professionalId, professionalId))
      .limit(1)
    const existing = rows[0]
    const next = {
      ...((existing?.calendarSync as Record<string, unknown> | null) ?? {}),
      buffer_minutes: bufferMinutes,
    }
    if (existing) {
      await tx
        .update(professionalSettings)
        .set({ calendarSync: next })
        .where(eq(professionalSettings.id, existing.id))
    } else {
      await tx
        .insert(professionalSettings)
        .values({ professionalId, calendarSync: next })
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC SLOTS COMPUTATION (for the booking widget)
//
// Computes 30-minute booking slots for a given calendar date by:
//   1. Pulling the active availability rules for that day-of-week
//   2. Subtracting any already-booked appointments (with optional buffer)
//
// Uses `dbAdmin` because the booking widget can be embedded on a public
// micro-site where the visitor has no Clerk session — RLS would block it.
// All inputs are scoped to the explicit `professionalId` so we never leak
// across tenants.
// ─────────────────────────────────────────────────────────────────────────────

export type BookingSlot = {
  start: Date
  end: Date
}

export async function getAvailableSlotsPublic(args: {
  professionalId: string
  from: Date
  to: Date
  slotMinutes?: number
}): Promise<BookingSlot[]> {
  const slotMinutes = args.slotMinutes ?? 30

  const [rules, busy, settingsRow] = await Promise.all([
    dbAdmin
      .select()
      .from(availabilitySlots)
      .where(
        and(
          eq(availabilitySlots.professionalId, args.professionalId),
          eq(availabilitySlots.isActive, true),
        ),
      ),
    dbAdmin
      .select({
        startAt: appointments.startAt,
        endAt: appointments.endAt,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.professionalId, args.professionalId),
          gte(appointments.startAt, args.from),
          lt(appointments.startAt, args.to),
          ne(appointments.status, "cancelled"),
        ),
      ),
    dbAdmin
      .select({ calendarSync: professionalSettings.calendarSync })
      .from(professionalSettings)
      .where(eq(professionalSettings.professionalId, args.professionalId))
      .limit(1),
  ])

  const buffer = Math.max(
    0,
    Number(
      (settingsRow[0]?.calendarSync as { buffer_minutes?: number } | null)
        ?.buffer_minutes ?? 0,
    ) || 0,
  )

  const rulesByDay = new Map<number, Array<{ start: string; end: string }>>()
  for (const r of rules) {
    const list = rulesByDay.get(r.dayOfWeek) ?? []
    list.push({ start: r.startTime, end: r.endTime })
    rulesByDay.set(r.dayOfWeek, list)
  }

  const slots: BookingSlot[] = []
  const dayCursor = new Date(args.from)
  dayCursor.setHours(0, 0, 0, 0)

  while (dayCursor < args.to) {
    const dow = dayCursor.getDay()
    const dayRules = rulesByDay.get(dow) ?? []
    for (const rule of dayRules) {
      const [sh, sm] = rule.start.split(":").map(Number) as [number, number]
      const [eh, em] = rule.end.split(":").map(Number) as [number, number]
      const ruleStart = new Date(dayCursor)
      ruleStart.setHours(sh, sm, 0, 0)
      const ruleEnd = new Date(dayCursor)
      ruleEnd.setHours(eh, em, 0, 0)

      let cursor = new Date(ruleStart)
      while (cursor.getTime() + slotMinutes * 60_000 <= ruleEnd.getTime()) {
        const slotStart = new Date(cursor)
        const slotEnd = new Date(cursor.getTime() + slotMinutes * 60_000)

        // Skip past slots and slots outside the requested window.
        if (slotStart >= args.from && slotEnd <= args.to) {
          const conflict = busy.some((b) => {
            const bStart = new Date(b.startAt).getTime() - buffer * 60_000
            const bEnd = new Date(b.endAt).getTime() + buffer * 60_000
            return slotStart.getTime() < bEnd && slotEnd.getTime() > bStart
          })
          if (!conflict && slotStart > new Date()) {
            slots.push({ start: slotStart, end: slotEnd })
          }
        }
        cursor = new Date(cursor.getTime() + slotMinutes * 60_000)
      }
    }
    dayCursor.setDate(dayCursor.getDate() + 1)
  }

  return slots
}

// Public booking — used by the micro-site booking widget. Resolves to an
// `appointment` with status "pending" so the professional can confirm. No RLS
// because the visitor is unauthenticated; we accept the {professionalId}
// resolved server-side from the micro-site slug.
export async function createPublicBooking(args: {
  professionalId: string
  serviceId?: string | null
  startAt: Date
  endAt: Date
  guestName: string
  guestEmail: string
  guestPhone?: string | null
  notes?: string | null
}): Promise<Appointment> {
  // Last-second conflict check — reject if a slot was taken between the time
  // the widget loaded and the time the visitor clicked Book.
  const conflicts = await dbAdmin
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.professionalId, args.professionalId),
        ne(appointments.status, "cancelled"),
        or(
          and(
            lte(appointments.startAt, args.startAt),
            gte(appointments.endAt, args.startAt),
          ),
          and(
            lte(appointments.startAt, args.endAt),
            gte(appointments.endAt, args.endAt),
          ),
          and(
            gte(appointments.startAt, args.startAt),
            lte(appointments.endAt, args.endAt),
          ),
        ),
      ),
    )
    .limit(1)
  if (conflicts.length > 0) {
    throw new Error("That slot was just taken — please pick another time.")
  }

  const [created] = await dbAdmin
    .insert(appointments)
    .values({
      professionalId: args.professionalId,
      serviceId: args.serviceId ?? null,
      title: `Booking · ${args.guestName}`,
      startAt: args.startAt,
      endAt: args.endAt,
      status: "pending",
      type: "in_person",
      notes: args.notes ?? null,
      metadata: {
        guest_name: args.guestName,
        guest_email: args.guestEmail,
        guest_phone: args.guestPhone ?? null,
      },
    })
    .returning()
  if (!created) throw new Error("Failed to create booking")
  return created
}

// Used by the public iCal feed route. Returns the next 90 days of appointments
// for a single professional. Uses dbAdmin so the iCal subscriber URL works
// without a Clerk session — the {professionalId} segment is the auth boundary.
export async function getAppointmentsForFeed(
  professionalId: string,
): Promise<Appointment[]> {
  const from = new Date()
  const to = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  return dbAdmin
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.professionalId, professionalId),
        gte(appointments.startAt, from),
        lt(appointments.startAt, to),
        inArray(appointments.status, [
          "scheduled",
          "confirmed",
          "pending",
          "completed",
        ]),
      ),
    )
    .orderBy(asc(appointments.startAt))
}

// Public lookup of the professional's display info (and timezone) used by the
// iCal feed and booking widget. Same justification as branding endpoint.
export async function getProfessionalForBookingPublic(
  professionalId: string,
): Promise<{
  id: string
  fullName: string
  email: string
  timezone: string
} | null> {
  const rows = await dbAdmin
    .select({
      id: professionals.id,
      fullName: professionals.fullName,
      email: professionals.email,
      timezone: professionals.timezone,
    })
    .from(professionals)
    .where(eq(professionals.id, professionalId))
    .limit(1)
  return rows[0] ?? null
}

export async function getActiveServicesPublic(
  professionalId: string,
): Promise<Pick<Service, "id" | "name" | "durationMinutes" | "price" | "currency">[]> {
  return dbAdmin
    .select({
      id: services.id,
      name: services.name,
      durationMinutes: services.durationMinutes,
      price: services.price,
      currency: services.currency,
    })
    .from(services)
    .where(
      and(
        eq(services.professionalId, professionalId),
        eq(services.isActive, true),
      ),
    )
    .orderBy(asc(services.name))
}
