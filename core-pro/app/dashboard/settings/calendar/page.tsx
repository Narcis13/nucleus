import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { getProfessional } from "@/lib/db/queries/professionals"
import { professionalSettings } from "@/lib/db/schema"
import { env } from "@/lib/env"
import type { CalendarSync } from "@/types/domain"

import { CalendarForm } from "./form"

export const dynamic = "force-dynamic"

export default async function CalendarSettingsPage() {
  const professional = await getProfessional()
  if (!professional) {
    redirect("/sign-in?redirect_url=/dashboard/settings/calendar")
  }

  const settings = await dbAdmin
    .select({ calendarSync: professionalSettings.calendarSync })
    .from(professionalSettings)
    .where(eq(professionalSettings.professionalId, professional.id))
    .limit(1)
  const calendarSync: CalendarSync =
    (settings[0]?.calendarSync as CalendarSync | null) ?? {}

  const icalUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/calendar/${professional.id}/ical`

  return (
    <CalendarForm
      initial={{
        timezone: professional.timezone ?? "Europe/Bucharest",
        google_calendar_sync_url: calendarSync.google_calendar_sync_url ?? null,
        ical_subscription_enabled:
          calendarSync.ical_subscription_enabled ?? true,
      }}
      icalUrl={icalUrl}
    />
  )
}
