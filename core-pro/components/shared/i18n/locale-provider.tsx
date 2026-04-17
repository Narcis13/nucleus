import { NextIntlClientProvider } from "next-intl"
import type { ReactNode } from "react"

import {
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n/config"

// ─────────────────────────────────────────────────────────────────────────────
// <LocaleOverrideProvider>
//
// Nests a `NextIntlClientProvider` inside the root-layout one so a subtree
// can opt into a different locale — used by the public micro-site, where
// the rendered language follows the professional's preference instead of the
// visitor's. The outer provider remains authoritative for everything else in
// the app, so a signed-in visitor reading a micro-site still sees their own
// language in any nested header chrome.
// ─────────────────────────────────────────────────────────────────────────────
export async function LocaleOverrideProvider({
  locale,
  timezone,
  children,
}: {
  locale: string | null | undefined
  timezone?: string | null
  children: ReactNode
}) {
  const resolved: Locale = normalizeLocale(locale ?? DEFAULT_LOCALE)
  const messages = (await import(`../../../messages/${resolved}.json`)).default
  return (
    <NextIntlClientProvider
      locale={resolved}
      messages={messages}
      timeZone={timezone ?? DEFAULT_TIMEZONE}
    >
      {children}
    </NextIntlClientProvider>
  )
}
