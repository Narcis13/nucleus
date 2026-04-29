import "server-only"

import {
  replaceAvailability,
  setCalendarBufferMinutes,
} from "@/lib/db/queries/appointments"
import { getProfessional } from "@/lib/db/queries/professionals"

import type { ServiceContext } from "../_lib/context"
import { ServiceError, UnauthorizedError } from "../_lib/errors"

export type SaveAvailabilityInput = {
  bufferMinutes: number
  slots: Array<{
    dayOfWeek: number
    startTime: string
    endTime: string
    isActive: boolean
  }>
}

export type SaveAvailabilityResult = { ok: true }

export async function saveAvailability(
  _ctx: ServiceContext,
  input: SaveAvailabilityInput,
): Promise<SaveAvailabilityResult> {
  const professional = await getProfessional()
  if (!professional) throw new UnauthorizedError()

  // Reject overlapping windows on the same day so the slot generator never
  // double-counts a working hour.
  const byDay = new Map<number, Array<{ start: string; end: string }>>()
  for (const s of input.slots) {
    if (s.endTime <= s.startTime) {
      throw new ServiceError("End time must be after start time.")
    }
    const list = byDay.get(s.dayOfWeek) ?? []
    list.push({ start: s.startTime, end: s.endTime })
    byDay.set(s.dayOfWeek, list)
  }
  for (const [, list] of byDay) {
    list.sort((a, b) => (a.start < b.start ? -1 : 1))
    for (let i = 1; i < list.length; i++) {
      if (list[i]!.start < list[i - 1]!.end) {
        throw new ServiceError("Availability windows must not overlap.")
      }
    }
  }

  await replaceAvailability(professional.id, input.slots)
  await setCalendarBufferMinutes(professional.id, input.bufferMinutes)

  return { ok: true }
}
