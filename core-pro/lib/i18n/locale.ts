import "server-only"

import { cookies } from "next/headers"

import { LOCALE_COOKIE, type Locale } from "./config"

// One-year cookie covers the realistic "until they explicitly change it" window.
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

// Server-side setter used by the locale switcher action. Must only be called
// from a Server Action or Route Handler — Next.js forbids cookie writes from
// Server Component renders and will throw at runtime.
export async function setLocaleCookie(locale: Locale): Promise<void> {
  const store = await cookies()
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
    httpOnly: false,
  })
}
