import "server-only"

import { clerkClient } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { clients } from "@/lib/db/schema"

// Standalone helper (no ServiceContext): callers may invoke from non-RLS
// contexts (e.g. GDPR delete route, webhooks) and so this intentionally uses
// `dbAdmin` rather than a tx-scoped Drizzle handle.
export async function cascadeDeleteClient(clientId: string): Promise<void> {
  // FK cascades on `clients` handle documents, forms, messages, appointments,
  // professional_clients, client_settings, client_tags. We also clear the
  // Clerk user if the client accepted an invitation so they can't log back in.
  const [row] = await dbAdmin
    .select({ clerkUserId: clients.clerkUserId })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1)

  await dbAdmin.delete(clients).where(eq(clients.id, clientId))

  if (row?.clerkUserId) {
    try {
      const client = await clerkClient()
      await client.users.deleteUser(row.clerkUserId)
    } catch {
      // Clerk delete is best-effort — the local row is already gone.
    }
  }
}
