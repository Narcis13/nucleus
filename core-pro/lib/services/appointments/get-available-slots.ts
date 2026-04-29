import "server-only"

import { getAvailableSlotsPublic } from "@/lib/db/queries/appointments"

// Why public: this runs from the unauthenticated booking widget on a
// professional's micro-site. No ServiceContext / withRLS — the underlying
// query uses dbAdmin deliberately because the visitor predates any
// RLS-eligible identity. The {professionalId} is the auth boundary; it is
// resolved server-side from the micro-site slug before reaching this layer.

export type GetAvailableSlotsInput = {
  professionalId: string
  from: string
  to: string
  slotMinutes?: number
}

export type GetAvailableSlotsResult = {
  slots: Array<{ start: string; end: string }>
}

export async function getAvailableSlots(
  input: GetAvailableSlotsInput,
): Promise<GetAvailableSlotsResult> {
  const slots = await getAvailableSlotsPublic({
    professionalId: input.professionalId,
    from: new Date(input.from),
    to: new Date(input.to),
    slotMinutes: input.slotMinutes,
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
}
