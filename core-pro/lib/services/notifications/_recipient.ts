import "server-only"

import { eq } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import type { RecipientKey } from "@/lib/db/queries/notification-settings"
import { clients, professionals } from "@/lib/db/schema"

// Maps a Clerk user id to the matching domain recipient (professional or
// client). Reads through `dbAdmin` deliberately: the lookup spans two
// RLS-scoped tables and the caller may legitimately be either side, so
// scoping by RLS would defeat the purpose. Underscore-prefixed because it's
// a domain-internal helper, not a verb-shaped service.
export async function resolveRecipient(
  userId: string,
): Promise<RecipientKey | null> {
  const pro = await dbAdmin
    .select({ id: professionals.id })
    .from(professionals)
    .where(eq(professionals.clerkUserId, userId))
    .limit(1)
  if (pro[0]) return { userId: pro[0].id, userType: "professional" }

  const cli = await dbAdmin
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.clerkUserId, userId))
    .limit(1)
  if (cli[0]) return { userId: cli[0].id, userType: "client" }

  return null
}
