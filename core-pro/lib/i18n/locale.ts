import "server-only"

import { cookies } from "next/headers"

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  type Locale,
  isLocale,
  normalizeLocale,
} from "./config"

// One-year cookie covers the realistic "until they explicitly change it" window.
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

// Server-side setter used by the locale switcher action and by any bootstrap
// flow that needs to pin the locale (e.g. portal sets the professional's
// locale on first visit if the client hasn't picked one).
export async function setLocaleCookie(locale: Locale): Promise<void> {
  const store = await cookies()
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
    httpOnly: false,
  })
}

// Read the current cookie synchronously from the request. Safe in server
// components and route handlers. Returns null if no cookie is present so the
// caller can distinguish "no preference yet" from "default".
export async function getLocaleCookie(): Promise<Locale | null> {
  const store = await cookies()
  const raw = store.get(LOCALE_COOKIE)?.value
  return raw && isLocale(raw) ? raw : null
}

// Ensure a DB-persisted locale (professional or client) ends up in the cookie,
// but never overwrite an explicit choice the user already made. Safe to call
// from Server Components: Next.js forbids cookie writes outside actions/route
// handlers, so we swallow that specific failure — the next action/route call
// will re-sync. The DB value remains the source of truth either way.
export async function syncLocaleFromDb(dbLocale: string | null | undefined) {
  const existing = await getLocaleCookie()
  if (existing) return
  const next = normalizeLocale(dbLocale ?? DEFAULT_LOCALE)
  try {
    await setLocaleCookie(next)
  } catch {
    // Rendering in a Server Component — cookie write unavailable. No-op.
  }
}
