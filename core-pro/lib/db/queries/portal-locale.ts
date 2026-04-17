import "server-only"

import { auth } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { clients, professionals } from "@/lib/db/schema"

// ─────────────────────────────────────────────────────────────────────────────
// getPortalLocalePreference
//
// Resolves which locale the portal should default to on first load. The rule:
//   1. If the signed-in client has an explicit `locale` on their row (they
//      picked a language in the switcher previously), that wins.
//   2. Otherwise the professional's `locale` (the workspace default) wins —
//      this is what the goal "Professional's locale → default for their
//      portal and micro-site" specifies.
//   3. Falls back to null, letting the request-config default take over.
//
// We use `dbAdmin` (service role) because clients don't have SELECT privilege
// on `professionals` outside the dashboard path.
// ─────────────────────────────────────────────────────────────────────────────
export async function getPortalLocalePreference(): Promise<string | null> {
  const { userId, orgId } = await auth()
  if (!userId) return null

  const clientRows = await dbAdmin
    .select({ locale: clients.locale })
    .from(clients)
    .where(eq(clients.clerkUserId, userId))
    .limit(1)
  const clientLocale = clientRows[0]?.locale ?? null

  if (!orgId) return clientLocale

  const proRows = await dbAdmin
    .select({ locale: professionals.locale })
    .from(professionals)
    .where(eq(professionals.clerkOrgId, orgId))
    .limit(1)
  const proLocale = proRows[0]?.locale ?? null

  return clientLocale ?? proLocale
}

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
