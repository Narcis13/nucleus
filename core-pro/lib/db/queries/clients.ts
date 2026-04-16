import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { withRLS } from "@/lib/db/rls"
import {
  clients,
  professionalClients,
  professionals,
} from "@/lib/db/schema"
import type { Client, NewClient } from "@/types/domain"

import { getProfessional } from "./professionals"

// Returns every client linked to the current professional via
// `professional_clients`. RLS already enforces the scope; the join returns
// the relationship row alongside so the UI can show status/role/source.
export async function getClients() {
  return withRLS(async (tx) => {
    return tx
      .select({
        client: clients,
        relationship: professionalClients,
      })
      .from(professionalClients)
      .innerJoin(clients, eq(clients.id, professionalClients.clientId))
      .orderBy(desc(professionalClients.createdAt))
  })
}

export async function getClient(clientId: string): Promise<Client | null> {
  return withRLS(async (tx) => {
    const rows = await tx
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1)
    return rows[0] ?? null
  })
}

// Inserts the client row + the professional_clients link in a single
// transaction. If either fails the whole thing rolls back, so we don't end up
// with a dangling client unattached to a professional.
export async function createClient(
  input: Omit<NewClient, "id" | "createdAt" | "updatedAt">,
  link?: { status?: string; role?: string; source?: string },
): Promise<Client> {
  const professional = await getProfessional()
  if (!professional) {
    throw new Error("No professional context — cannot create client")
  }
  return withRLS(async (tx) => {
    const [created] = await tx.insert(clients).values(input).returning()
    if (!created) throw new Error("Failed to insert client")
    await tx.insert(professionalClients).values({
      professionalId: professional.id,
      clientId: created.id,
      status: link?.status ?? "active",
      role: link?.role ?? "client",
      source: link?.source,
    })
    return created
  })
}

export async function updateClient(
  clientId: string,
  patch: Partial<Omit<Client, "id" | "createdAt" | "updatedAt">>,
): Promise<Client | null> {
  return withRLS(async (tx) => {
    const rows = await tx
      .update(clients)
      .set(patch)
      .where(eq(clients.id, clientId))
      .returning()
    return rows[0] ?? null
  })
}

// Toggles a `professional_clients` link to "archived" instead of hard-deleting
// the client row. Useful when the client may be re-engaged later.
export async function archiveClient(clientId: string) {
  const professional = await getProfessional()
  if (!professional) return null
  return withRLS(async (tx) => {
    const rows = await tx
      .update(professionalClients)
      .set({ status: "archived" })
      .where(
        and(
          eq(professionalClients.clientId, clientId),
          eq(professionalClients.professionalId, professional.id),
        ),
      )
      .returning()
    return rows[0] ?? null
  })
}

// Re-export so callers can do `import { getProfessional } from "queries/clients"`
// when client lookups need the owner — but most callers should pull it from
// professionals directly.
export { professionals }
