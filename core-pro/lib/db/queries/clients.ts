import "server-only"

import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm"

import { withRLS } from "@/lib/db/rls"
import {
  appointments,
  clientTags,
  clients,
  documents,
  formAssignments,
  invoices,
  messages,
  professionalClients,
  professionals,
  tags,
} from "@/lib/db/schema"
import type {
  Client,
  ClientTag,
  NewClient,
  ProfessionalClient,
  Tag,
} from "@/types/domain"

import { getProfessional } from "./professionals"

// ─────────────────────────────────────────────────────────────────────────────
// Client list — joins the client row, the professional_clients relationship,
// and a JSON aggregate of tags so the UI can render the list without an extra
// N+1 round-trip per row. RLS scopes results to the current professional.
// ─────────────────────────────────────────────────────────────────────────────
export type ClientListItem = {
  client: Client
  relationship: ProfessionalClient
  tags: Tag[]
  lastActivityAt: Date | null
}

export type ClientListFilters = {
  search?: string
  tagIds?: string[]
  status?: string | null
  createdFrom?: string
  createdTo?: string
}

// Postgres returns jsonb_agg as parsed JSON; we type it narrowly so the
// caller doesn't have to cast. Rows with no tags get `[null]` — filtered out
// client-side below.
type RawTagJson = { id: string; name: string; color: string } | null

export async function getClients(
  filters: ClientListFilters = {},
): Promise<ClientListItem[]> {
  return withRLS(async (tx) => {
    const conditions = []
    if (filters.search?.trim()) {
      const q = `%${filters.search.trim()}%`
      conditions.push(
        or(
          ilike(clients.fullName, q),
          ilike(clients.email, q),
          ilike(clients.phone, q),
        ),
      )
    }
    if (filters.status) {
      conditions.push(eq(professionalClients.status, filters.status))
    }
    if (filters.createdFrom) {
      conditions.push(gte(professionalClients.createdAt, new Date(filters.createdFrom)))
    }
    if (filters.createdTo) {
      conditions.push(lte(professionalClients.createdAt, new Date(filters.createdTo)))
    }

    const rows = await tx
      .select({
        client: clients,
        relationship: professionalClients,
        tagsJson: sql<RawTagJson[]>`
          coalesce(
            (
              select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color))
              from public.client_tags ct
              inner join public.tags t on t.id = ct.tag_id
              where ct.client_id = ${clients.id}
            ),
            '[]'::jsonb
          )
        `,
        lastActivityAt: sql<Date | null>`${professionalClients.createdAt}`,
      })
      .from(professionalClients)
      .innerJoin(clients, eq(clients.id, professionalClients.clientId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(professionalClients.createdAt))

    const mapped: ClientListItem[] = rows.map((r) => ({
      client: r.client,
      relationship: r.relationship,
      tags: (r.tagsJson ?? [])
        .filter((t): t is NonNullable<RawTagJson> => t !== null)
        .map((t) => ({
          id: t.id,
          name: t.name,
          color: t.color,
          professionalId: r.relationship.professionalId,
          createdAt: r.relationship.createdAt,
        })),
      lastActivityAt: r.lastActivityAt,
    }))

    // Tag filter is applied in memory — aggregated tags live in the jsonb
    // projection, so filtering at SQL level would require a second join.
    // Lists are small (bounded by plan limits), so this is fine.
    if (filters.tagIds && filters.tagIds.length > 0) {
      const tagSet = new Set(filters.tagIds)
      return mapped.filter((row) => row.tags.some((t) => tagSet.has(t.id)))
    }
    return mapped
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

// Full client detail for the profile page — includes relationship + tags.
export async function getClientWithRelationship(clientId: string): Promise<
  | {
      client: Client
      relationship: ProfessionalClient
      tags: Tag[]
    }
  | null
> {
  return withRLS(async (tx) => {
    const rows = await tx
      .select({ client: clients, relationship: professionalClients })
      .from(professionalClients)
      .innerJoin(clients, eq(clients.id, professionalClients.clientId))
      .where(eq(clients.id, clientId))
      .limit(1)
    const row = rows[0]
    if (!row) return null

    const tagRows = await tx
      .select({ tag: tags })
      .from(clientTags)
      .innerJoin(tags, eq(tags.id, clientTags.tagId))
      .where(eq(clientTags.clientId, clientId))

    return {
      client: row.client,
      relationship: row.relationship,
      tags: tagRows.map((t) => t.tag),
    }
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

// Updates fields on the professional↔client relationship (status, notes,
// source) without touching the client row itself.
export async function updateRelationship(
  clientId: string,
  patch: Partial<
    Pick<ProfessionalClient, "status" | "role" | "source" | "notes">
  >,
): Promise<ProfessionalClient | null> {
  const professional = await getProfessional()
  if (!professional) return null
  return withRLS(async (tx) => {
    const rows = await tx
      .update(professionalClients)
      .set(patch)
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

// ─────────────────────────────────────────────────────────────────────────────
// Tags
// ─────────────────────────────────────────────────────────────────────────────
export async function getTags(): Promise<Tag[]> {
  return withRLS(async (tx) => {
    return tx.select().from(tags).orderBy(asc(tags.name))
  })
}

export async function createTag(input: {
  name: string
  color?: string
}): Promise<Tag> {
  const professional = await getProfessional()
  if (!professional) throw new Error("No professional context")
  return withRLS(async (tx) => {
    const [created] = await tx
      .insert(tags)
      .values({
        professionalId: professional.id,
        name: input.name,
        color: input.color ?? "#6366f1",
      })
      .returning()
    if (!created) throw new Error("Failed to insert tag")
    return created
  })
}

export async function deleteTag(tagId: string) {
  return withRLS(async (tx) => {
    return tx.delete(tags).where(eq(tags.id, tagId)).returning()
  })
}

export async function addTagToClient(
  clientId: string,
  tagId: string,
): Promise<ClientTag | null> {
  return withRLS(async (tx) => {
    const [row] = await tx
      .insert(clientTags)
      .values({ clientId, tagId })
      .onConflictDoNothing()
      .returning()
    return row ?? null
  })
}

export async function removeTagFromClient(clientId: string, tagId: string) {
  return withRLS(async (tx) => {
    return tx
      .delete(clientTags)
      .where(
        and(eq(clientTags.clientId, clientId), eq(clientTags.tagId, tagId)),
      )
      .returning()
  })
}

// Bulk tag assignment used by the list's "Apply tag to selected" action.
export async function addTagToClients(
  clientIds: string[],
  tagId: string,
): Promise<number> {
  if (clientIds.length === 0) return 0
  return withRLS(async (tx) => {
    const rows = await tx
      .insert(clientTags)
      .values(clientIds.map((clientId) => ({ clientId, tagId })))
      .onConflictDoNothing()
      .returning()
    return rows.length
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity timeline — aggregates rows from several tables into a single feed.
// Kept here (and not in a dedicated `activity` table) because a real feed
// system is overkill at this stage; five joins is fine for MVP.
// ─────────────────────────────────────────────────────────────────────────────
export type ActivityEntry = {
  id: string
  type: "document" | "invoice" | "form" | "message" | "appointment" | "relationship"
  title: string
  description?: string | null
  occurredAt: Date
}

export async function getClientActivity(
  clientId: string,
): Promise<ActivityEntry[]> {
  return withRLS(async (tx) => {
    const [docs, inv, formRows, msgs, appts, rels] = await Promise.all([
      tx
        .select({
          id: documents.id,
          name: documents.name,
          createdAt: documents.createdAt,
        })
        .from(documents)
        .where(eq(documents.clientId, clientId))
        .orderBy(desc(documents.createdAt))
        .limit(20),
      tx
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          status: invoices.status,
          amount: invoices.amount,
          currency: invoices.currency,
          createdAt: invoices.createdAt,
        })
        .from(invoices)
        .where(eq(invoices.clientId, clientId))
        .orderBy(desc(invoices.createdAt))
        .limit(20),
      tx
        .select({
          id: formAssignments.id,
          status: formAssignments.status,
          createdAt: formAssignments.createdAt,
        })
        .from(formAssignments)
        .where(eq(formAssignments.clientId, clientId))
        .orderBy(desc(formAssignments.createdAt))
        .limit(20),
      tx
        .select({
          id: messages.id,
          content: messages.content,
          createdAt: messages.createdAt,
          senderRole: messages.senderRole,
        })
        .from(messages)
        .innerJoin(
          sql`public.conversations c`,
          sql`c.id = ${messages.conversationId} and c.client_id = ${clientId}`,
        )
        .orderBy(desc(messages.createdAt))
        .limit(20),
      tx
        .select({
          id: appointments.id,
          status: appointments.status,
          startAt: appointments.startAt,
          createdAt: appointments.createdAt,
        })
        .from(appointments)
        .where(eq(appointments.clientId, clientId))
        .orderBy(desc(appointments.createdAt))
        .limit(20),
      tx
        .select({
          id: professionalClients.id,
          status: professionalClients.status,
          createdAt: professionalClients.createdAt,
        })
        .from(professionalClients)
        .where(eq(professionalClients.clientId, clientId))
        .orderBy(desc(professionalClients.createdAt))
        .limit(5),
    ])

    const entries: ActivityEntry[] = [
      ...docs.map<ActivityEntry>((d) => ({
        id: `doc:${d.id}`,
        type: "document",
        title: "Document uploaded",
        description: d.name,
        occurredAt: d.createdAt,
      })),
      ...inv.map<ActivityEntry>((i) => ({
        id: `inv:${i.id}`,
        type: "invoice",
        title: `Invoice ${i.invoiceNumber} · ${i.status}`,
        description: `${i.amount} ${i.currency}`,
        occurredAt: i.createdAt,
      })),
      ...formRows.map<ActivityEntry>((f) => ({
        id: `form:${f.id}`,
        type: "form",
        title: `Form ${f.status}`,
        description: null,
        occurredAt: f.createdAt,
      })),
      ...msgs.map<ActivityEntry>((m) => ({
        id: `msg:${m.id}`,
        type: "message",
        title: m.senderRole === "client" ? "Client messaged" : "You messaged",
        description: m.content?.slice(0, 120) ?? null,
        occurredAt: m.createdAt,
      })),
      ...appts.map<ActivityEntry>((a) => ({
        id: `apt:${a.id}`,
        type: "appointment",
        title: `Appointment ${a.status}`,
        description: a.startAt?.toISOString() ?? null,
        occurredAt: a.createdAt,
      })),
      ...rels.map<ActivityEntry>((r) => ({
        id: `rel:${r.id}`,
        type: "relationship",
        title: `Relationship: ${r.status}`,
        description: null,
        occurredAt: r.createdAt,
      })),
    ]
    return entries.sort(
      (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime(),
    )
  })
}

// Lists relevant to tabbed profile. Kept alongside client queries since they
// are only used in this context.
export async function getClientDocuments(clientId: string) {
  return withRLS(async (tx) => {
    return tx
      .select()
      .from(documents)
      .where(eq(documents.clientId, clientId))
      .orderBy(desc(documents.createdAt))
  })
}

export async function getClientInvoices(clientId: string) {
  return withRLS(async (tx) => {
    return tx
      .select()
      .from(invoices)
      .where(eq(invoices.clientId, clientId))
      .orderBy(desc(invoices.createdAt))
  })
}

export async function getClientForms(clientId: string) {
  return withRLS(async (tx) => {
    return tx
      .select()
      .from(formAssignments)
      .where(eq(formAssignments.clientId, clientId))
      .orderBy(desc(formAssignments.createdAt))
  })
}

// Counts the number of *active* clients for a professional — used to check
// plan limits before creating a new client.
export async function countActiveClients(): Promise<number> {
  const professional = await getProfessional()
  if (!professional) return 0
  return withRLS(async (tx) => {
    const rows = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(professionalClients)
      .where(
        and(
          eq(professionalClients.professionalId, professional.id),
          eq(professionalClients.status, "active"),
        ),
      )
    return rows[0]?.count ?? 0
  })
}

// Used by the CSV export to re-hydrate the same rows as the list for a
// specific set of ids. Only used after a bulk selection from the UI.
export async function getClientsByIds(
  clientIds: string[],
): Promise<ClientListItem[]> {
  if (clientIds.length === 0) return []
  return withRLS(async (tx) => {
    const rows = await tx
      .select({
        client: clients,
        relationship: professionalClients,
      })
      .from(professionalClients)
      .innerJoin(clients, eq(clients.id, professionalClients.clientId))
      .where(inArray(clients.id, clientIds))

    const tagRows = await tx
      .select({ clientId: clientTags.clientId, tag: tags })
      .from(clientTags)
      .innerJoin(tags, eq(tags.id, clientTags.tagId))
      .where(inArray(clientTags.clientId, clientIds))

    const tagsByClient = new Map<string, Tag[]>()
    for (const tr of tagRows) {
      const list = tagsByClient.get(tr.clientId) ?? []
      list.push(tr.tag)
      tagsByClient.set(tr.clientId, list)
    }

    return rows.map<ClientListItem>((r) => ({
      client: r.client,
      relationship: r.relationship,
      tags: tagsByClient.get(r.client.id) ?? [],
      lastActivityAt: r.relationship.createdAt,
    }))
  })
}

// Re-export so callers can do `import { getProfessional } from "queries/clients"`
// when client lookups need the owner — but most callers should pull it from
// professionals directly.
export { professionals }
