"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { publicAction } from "@/lib/actions/safe-action"
import { LOCALES } from "@/lib/i18n/config"
import { setLocaleCookie } from "@/lib/i18n/locale"
import { setUserLocale } from "@/lib/services/locale/set-user-locale"

// ─────────────────────────────────────────────────────────────────────────────
// Locale switcher action
//
// The cookie drives what `getRequestConfig` hands to `NextIntlClientProvider`,
// so flipping it + revalidating "/" is enough for every authenticated screen
// to repaint in the new language on next render.
//
// For signed-in users we also persist the choice on their DB row so it
// survives across devices. Anonymous visitors (marketing pages, micro-sites)
// only get the cookie — no row exists yet.
// ─────────────────────────────────────────────────────────────────────────────
const setLocaleSchema = z.object({
  locale: z.enum(LOCALES),
})

export const setLocaleAction = publicAction
  .metadata({ actionName: "locale.set" })
  .inputSchema(setLocaleSchema)
  .action(async ({ parsedInput }) => {
    await setLocaleCookie(parsedInput.locale)

    const { userId } = await auth()
    if (userId) {
      try {
        await setUserLocale(userId, parsedInput.locale)
      } catch (err) {
        // Non-fatal — the cookie is already set so the UI still switches.
        if (process.env.NODE_ENV !== "production") {
          console.warn("setLocaleAction: DB persistence failed", err)
        }
      }
    }

    revalidatePath("/", "layout")
    return { locale: parsedInput.locale }
  })
