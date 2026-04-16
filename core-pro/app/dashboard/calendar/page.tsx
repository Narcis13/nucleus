import { asc, eq } from "drizzle-orm"
import { redirect } from "next/navigation"

import { AgendaSidebar } from "@/components/dashboard/calendar/agenda-sidebar"
import {
  CalendarGrid,
  type CalendarEvent,
} from "@/components/dashboard/calendar/calendar-grid"
import { PageHeader } from "@/components/shared/page-header"
import { withRLS } from "@/lib/db/rls"
import {
  getAppointments,
  getAvailabilitySlots,
  getCalendarBufferMinutes,
  getUpcomingAppointments,
} from "@/lib/db/queries/appointments"
import { getProfessional } from "@/lib/db/queries/professionals"
import { clients, services } from "@/lib/db/schema"
import { env } from "@/lib/env"

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard → Calendar
//
// Loads three independent datasets in parallel:
//   1. The current six-week visible window (covers month view at most)
//   2. Today + upcoming for the right-rail agenda
//   3. Availability rules + buffer for the editor dialog
// Plus the small client/service lookup lists used by the appointment form.
//
// All reads go through `withRLS` so they're scoped to the current professional.
// The page is a Server Component; the calendar grid is the only client island.
// ─────────────────────────────────────────────────────────────────────────────

export default async function CalendarPage() {
  const professional = await getProfessional()
  if (!professional) redirect("/onboarding")

  const range = sixWeekRange()

  const [windowAppts, todayAppts, upcomingAppts, availability, buffer, lookups] =
    await Promise.all([
      getAppointments(range),
      getAppointments(todayRange()),
      getUpcomingAppointments(8),
      getAvailabilitySlots(),
      getCalendarBufferMinutes(),
      loadLookups(),
    ])

  const events: CalendarEvent[] = windowAppts.map((row) => ({
    id: row.appointment.id,
    title: row.appointment.title,
    startAt: new Date(row.appointment.startAt),
    endAt: new Date(row.appointment.endAt),
    status: row.appointment.status,
    type: row.appointment.type,
    clientName: row.client?.fullName ?? null,
    appointment: row.appointment,
  }))

  const iCalUrl = `${env.NEXT_PUBLIC_APP_URL}/api/calendar/${professional.id}/ical`

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calendar"
        description="Your appointments, availability, and scheduling rules in one place."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <CalendarGrid
          events={events}
          availability={availability}
          bufferMinutes={buffer}
          clients={lookups.clients}
          services={lookups.services}
        />
        <AgendaSidebar
          today={todayAppts}
          upcoming={upcomingAppts}
          iCalUrl={iCalUrl}
        />
      </div>
    </div>
  )
}

function todayRange(): { from: Date; to: Date } {
  const from = new Date()
  from.setHours(0, 0, 0, 0)
  const to = new Date(from)
  to.setDate(to.getDate() + 1)
  return { from, to }
}

function sixWeekRange(): { from: Date; to: Date } {
  // Anchor on the start of the current week and reach far enough that the
  // month view (which spans up to 6 weeks) is fully covered without a refetch
  // on view changes. A future enhancement could refetch on navigation.
  const from = new Date()
  from.setHours(0, 0, 0, 0)
  from.setDate(from.getDate() - 14)
  const to = new Date(from)
  to.setDate(to.getDate() + 56)
  return { from, to }
}

async function loadLookups() {
  return withRLS(async (tx) => {
    const [clientRows, serviceRows] = await Promise.all([
      tx
        .select({ id: clients.id, fullName: clients.fullName })
        .from(clients)
        .orderBy(asc(clients.fullName))
        .limit(500),
      tx
        .select({
          id: services.id,
          name: services.name,
          durationMinutes: services.durationMinutes,
        })
        .from(services)
        .where(eq(services.isActive, true))
        .orderBy(asc(services.name))
        .limit(200),
    ])
    return {
      clients: clientRows,
      services: serviceRows,
    }
  })
}
