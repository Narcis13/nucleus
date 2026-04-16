import "server-only"

import type {
  NotificationChannel,
  NotificationPreferences,
  NotificationType,
  QuietHours,
} from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// Notification preference defaults + resolver.
//
// Policy:
//   • Everything is opt-out: missing keys are treated as "enabled". This way
//     adding a new NotificationType doesn't silently suppress it for existing
//     users whose stored prefs predate the new type.
//   • Quiet hours suppress email + push only — in-app notifications still
//     record to the bell so the user can catch up later. An in-app record is
//     also what drives unread counts, which must stay accurate regardless of
//     delivery preferences.
//   • The resolver is pure — it does not read the DB. Callers pass the stored
//     jsonb (or null for a user with no row yet) and receive a concrete
//     channels list. Unit-testable in isolation.
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_PREFERENCES: Required<NotificationPreferences> = {
  per_type: {
    message: true,
    appointment: true,
    form: true,
    lead: true,
    invoice: true,
    document: true,
    system: true,
  },
  per_channel: {
    in_app: true,
    email: true,
    push: true,
  },
  quiet_hours: {
    enabled: false,
    start: "22:00",
    end: "07:00",
  },
}

// True when the given type is enabled for the user. Missing → enabled.
export function isTypeEnabled(
  prefs: NotificationPreferences | null | undefined,
  type: NotificationType,
): boolean {
  const v = prefs?.per_type?.[type]
  return v === undefined ? true : v
}

// True when the given channel is enabled for the user. Missing → enabled.
export function isChannelEnabled(
  prefs: NotificationPreferences | null | undefined,
  channel: NotificationChannel,
): boolean {
  const v = prefs?.per_channel?.[channel]
  return v === undefined ? true : v
}

// Returns the subset of requested channels that should actually fire for this
// user + type at this moment. In-app is never suppressed by quiet hours so the
// bell keeps an accurate unread count.
export function resolveChannels(args: {
  requested: NotificationChannel[]
  prefs: NotificationPreferences | null | undefined
  type: NotificationType
  timezone?: string | null
  now?: Date
}): NotificationChannel[] {
  if (!isTypeEnabled(args.prefs, args.type)) return []
  const quiet = args.prefs?.quiet_hours ?? DEFAULT_PREFERENCES.quiet_hours
  const inQuiet = quiet.enabled
    ? isWithinQuietHours({
        quiet,
        timezone: args.timezone ?? "UTC",
        now: args.now ?? new Date(),
      })
    : false
  return args.requested.filter((channel) => {
    if (!isChannelEnabled(args.prefs, channel)) return false
    if (inQuiet && (channel === "email" || channel === "push")) return false
    return true
  })
}

// True when `now` falls inside the quiet-hours window in `timezone`. Handles
// windows that wrap midnight (e.g. 22:00 → 07:00).
export function isWithinQuietHours(args: {
  quiet: QuietHours
  timezone: string
  now: Date
}): boolean {
  const { quiet, timezone, now } = args
  if (!quiet.enabled) return false
  const start = parseHHMM(quiet.start)
  const end = parseHHMM(quiet.end)
  if (start === null || end === null) return false
  const current = getLocalMinutes(now, timezone)
  if (start === end) return false
  if (start < end) return current >= start && current < end
  // Wrapping window — either after `start` today or before `end` tomorrow.
  return current >= start || current < end
}

function parseHHMM(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return hours * 60 + minutes
}

// Minutes past local midnight in `timezone`. Uses the Intl formatter so we
// don't pull in date-fns-tz / luxon for a two-number conversion.
function getLocalMinutes(now: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now)
  const hourStr = parts.find((p) => p.type === "hour")?.value ?? "0"
  const minuteStr = parts.find((p) => p.type === "minute")?.value ?? "0"
  const hours = Number(hourStr) === 24 ? 0 : Number(hourStr)
  return hours * 60 + Number(minuteStr)
}
