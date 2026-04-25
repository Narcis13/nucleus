import "server-only"

import {
  getProfessional,
  updateProfessional,
} from "@/lib/db/queries/professionals"
import type { CalendarSync } from "@/types/domain"

import type { ServiceContext } from "../_lib/context"
import { UnauthorizedError } from "../_lib/errors"
import {
  cleanUndefined,
  getExistingSettings,
  upsertProfessionalSettings,
} from "./_lib"

export type UpdateCalendarSyncInput = {
  timezone?: string
  google_calendar_sync_url?: string | null
  ical_subscription_enabled?: boolean
}

export type UpdateCalendarSyncResult = {
  calendarSync: CalendarSync
}

export async function updateCalendarSync(
  _ctx: ServiceContext,
  input: UpdateCalendarSyncInput,
): Promise<UpdateCalendarSyncResult> {
  const professional = await getProfessional()
  if (!professional) throw new UnauthorizedError()

  if (input.timezone && input.timezone !== professional.timezone) {
    await updateProfessional({ timezone: input.timezone })
  }

  const nextSync: CalendarSync = {
    ...(await getExistingSettings(professional.id)).calendarSync,
    ...cleanUndefined(input),
  }

  await upsertProfessionalSettings(professional.id, { calendarSync: nextSync })

  return { calendarSync: nextSync }
}
