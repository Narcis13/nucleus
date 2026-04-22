import "server-only"

import { auth } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { professionals } from "@/lib/db/schema"

// Dashboard-side variant — reads the signed-in professional's locale.
export async function getDashboardLocalePreference(): Promise<string | null> {
  const { userId } = await auth()
  if (!userId) return null
  const rows = await dbAdmin
    .select({ locale: professionals.locale })
    .from(professionals)
    .where(eq(professionals.clerkUserId, userId))
    .limit(1)
  return rows[0]?.locale ?? null
}
