// Pure date-range helpers shared by server queries (`lib/analytics/queries`)
// and client range pickers. Keep this file free of server-only imports so
// the client bundle can pull in the presets without dragging in postgres/tls.

export type DateRange = {
  from: Date
  to: Date
}

export type RangePreset = "week" | "month" | "quarter" | "year" | "custom"

export const RANGE_PRESETS: Array<{ value: RangePreset; label: string }> = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "quarter", label: "This quarter" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom" },
]

export function resolveRange(
  preset: RangePreset,
  custom?: { from?: string; to?: string },
): DateRange {
  const now = new Date()
  const to = new Date(now)
  to.setHours(23, 59, 59, 999)
  const from = new Date(now)
  from.setHours(0, 0, 0, 0)

  if (preset === "week") {
    const day = from.getDay()
    const offset = day === 0 ? 6 : day - 1
    from.setDate(from.getDate() - offset)
  } else if (preset === "month") {
    from.setDate(1)
  } else if (preset === "quarter") {
    const q = Math.floor(from.getMonth() / 3)
    from.setMonth(q * 3, 1)
  } else if (preset === "year") {
    from.setMonth(0, 1)
  } else if (preset === "custom") {
    if (custom?.from) {
      const parsed = new Date(custom.from)
      if (!Number.isNaN(parsed.getTime())) {
        parsed.setHours(0, 0, 0, 0)
        return {
          from: parsed,
          to: custom.to
            ? (() => {
                const t = new Date(custom.to)
                t.setHours(23, 59, 59, 999)
                return t
              })()
            : to,
        }
      }
    }
  }

  return { from, to }
}
