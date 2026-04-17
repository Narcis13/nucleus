"use server"

import { auth } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { publicAction } from "@/lib/actions/safe-action"
import { dbAdmin } from "@/lib/db/client"
import { clients, professionals } from "@/lib/db/schema"
import { LOCALES } from "@/lib/i18n/config"
import { setLocaleCookie } from "@/lib/i18n/locale"

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

    // Persist for the signed-in user so the preference follows them. We try
    // both tables: professionals for dashboard users, clients for portal
    // users. Writes go through dbAdmin because the action may run before RLS
    // context is attached on certain auth transitions.
    const { userId } = await auth()
    if (userId) {
      try {
        await dbAdmin
          .update(professionals)
          .set({ locale: parsedInput.locale })
          .where(eq(professionals.clerkUserId, userId))
        await dbAdmin
          .update(clients)
          .set({ locale: parsedInput.locale })
          .where(eq(clients.clerkUserId, userId))
      } catch (err) {
        // Non-fatal — the cookie is already set so the UI still switches.
        // Surface an error only when literally nothing worked.
        if (process.env.NODE_ENV !== "production") {
          console.warn("setLocaleAction: DB persistence failed", err)
        }
      }
    }

    revalidatePath("/", "layout")
    return { locale: parsedInput.locale }
  })
