import "server-only"

import { eq } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { getProfessional } from "@/lib/db/queries/professionals"
import { clients } from "@/lib/db/schema"

// Resolves the current Clerk user to one of { professional, client } with
// their internal uuid. Uses dbAdmin for the client-side lookup to avoid
// opening a second RLS transaction inside the action (the outer authedAction
// is already in one). For the professional side we reuse `getProfessional`.
export async function resolveSender(
  userId: string,
): Promise<{ id: string; role: "professional" | "client" } | null> {
  const professional = await getProfessional()
  if (professional) return { id: professional.id, role: "professional" }

  if (!userId) return null
  const rows = await dbAdmin
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.clerkUserId, userId))
    .limit(1)
  const clientRow = rows[0]
  if (!clientRow) return null
  return { id: clientRow.id, role: "client" }
}
