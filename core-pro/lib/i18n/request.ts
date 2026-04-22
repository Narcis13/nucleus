import "server-only"

import { cookies, headers } from "next/headers"
import { getRequestConfig } from "next-intl/server"

import {
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
  LOCALE_COOKIE,
  type Locale,
  normalizeLocale,
} from "./config"

// Resolve the request's locale in strict priority order:
//   1. Locale cookie set by the switcher — most authoritative, reflects the
//      user's last explicit choice whether they're signed in or not.
//   2. Accept-Language header — honours the browser preference for first-time
//      visitors who haven't picked a language yet.
//   3. DEFAULT_LOCALE — the product defaults to Romanian.
//
// We intentionally do NOT query the database here: getRequestConfig runs on
// every navigation, so a DB round-trip would regress TTFB. DB-persisted
// locale is synced into the cookie by the locale-switcher Server Action
// (see lib/actions/locale.ts).
async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(LOCALE_COOKIE)?.value
  if (cookieValue) return normalizeLocale(cookieValue)

  const h = await headers()
  const acceptLanguage = h.get("accept-language")
  if (acceptLanguage) {
    const primary = acceptLanguage.split(",")[0]?.trim()
    if (primary) return normalizeLocale(primary)
  }

  return DEFAULT_LOCALE
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale()
  const messages = (await import(`../../messages/${locale}.json`)).default
  return {
    locale,
    messages,
    timeZone: DEFAULT_TIMEZONE,
    // Default formats re-used everywhere, so every call site doesn't repeat
    // the same { dateStyle: "medium" } object.
    formats: {
      dateTime: {
        short: { dateStyle: "short" },
        medium: { dateStyle: "medium" },
        long: { dateStyle: "long" },
        full: { dateStyle: "full" },
        time: { timeStyle: "short" },
        datetime: { dateStyle: "medium", timeStyle: "short" },
      },
      number: {
        percent: { style: "percent", maximumFractionDigits: 1 },
      },
    },
  }
})
