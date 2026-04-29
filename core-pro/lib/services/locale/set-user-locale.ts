import "server-only"

import { eq } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { clients, professionals } from "@/lib/db/schema"
import type { Locale } from "@/lib/i18n/config"

// Persists a user's locale preference to whichever row matches their Clerk
// user id. Touches both tables because the same Clerk identity may be a
// dashboard professional or a portal client (or, edge case, both during a
// migration). Writes through `dbAdmin` deliberately — locale switching can
// happen during auth transitions before RLS context is attached, and we
// don't want a missing context to silently drop the preference.
//
// Caller is expected to handle thrown errors as non-fatal; the cookie write
// in the action layer keeps the UI working even if persistence fails.
export async function setUserLocale(
  userId: string,
  locale: Locale,
): Promise<void> {
  await dbAdmin
    .update(professionals)
    .set({ locale })
    .where(eq(professionals.clerkUserId, userId))
  await dbAdmin
    .update(clients)
    .set({ locale })
    .where(eq(clients.clerkUserId, userId))
}
