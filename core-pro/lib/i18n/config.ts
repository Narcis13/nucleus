// Central source of truth for locales, currencies, and timezones used
// across the app. Keep this file dependency-free so both server and client
// entrypoints can import it without pulling in Next.js server internals.

export const LOCALES = ["ro", "en"] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = "ro"
export const DEFAULT_TIMEZONE = "Europe/Bucharest"
export const DEFAULT_CURRENCY = "EUR"

// Cookie name that persists the user's chosen locale across requests and
// is read in `getRequestConfig`. A session cookie survives restarts but
// doesn't require login.
export const LOCALE_COOKIE = "core-pro-locale"

export const LOCALE_LABELS: Record<Locale, string> = {
  ro: "Română",
  en: "English",
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value)
}

export function normalizeLocale(value: string | null | undefined): Locale {
  if (!value) return DEFAULT_LOCALE
  const lower = value.toLowerCase()
  if (isLocale(lower)) return lower
  const primary = lower.split("-")[0]
  return isLocale(primary) ? primary : DEFAULT_LOCALE
}
