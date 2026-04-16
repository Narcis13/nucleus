import "server-only"

import { and, desc, eq, ilike, inArray, sql } from "drizzle-orm"

import { withRLS } from "@/lib/db/rls"
import { clients, documents } from "@/lib/db/schema"
import type { Client, Document } from "@/types/domain"

import { getProfessional } from "./professionals"

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS
// Metadata rows for files living in the `documents` Supabase Storage bucket.
// Storage key convention: `<professional_id>/<client_id | "general">/<uuid>-<filename>`
// RLS limits professionals to their own rows; clients see only the rows they
// are linked to via `clientId`.
// ─────────────────────────────────────────────────────────────────────────────

export type DocumentListFilters = {
  search?: string
  clientId?: string | null // null → general docs only; undefined → all
  category?: string | null
  fileType?: string | null
}

export type DocumentWithClient = Document & {
  client: Pick<Client, "id" | "fullName" | "avatarUrl"> | null
}

export async function getDocuments(
  filters: DocumentListFilters = {},
): Promise<DocumentWithClient[]> {
  return withRLS(async (tx) => {
    const conditions = []
    if (filters.search?.trim()) {
      conditions.push(ilike(documents.name, `%${filters.search.trim()}%`))
    }
    if (filters.clientId !== undefined) {
      if (filters.clientId === null) {
        conditions.push(sql`${documents.clientId} is null`)
      } else {
        conditions.push(eq(documents.clientId, filters.clientId))
      }
    }
    if (filters.category) {
      conditions.push(eq(documents.category, filters.category))
    }
    if (filters.fileType) {
      conditions.push(ilike(documents.fileType, `${filters.fileType}%`))
    }

    const rows = await tx
      .select({
        doc: documents,
        client: {
          id: clients.id,
          fullName: clients.fullName,
          avatarUrl: clients.avatarUrl,
        },
      })
      .from(documents)
      .leftJoin(clients, eq(clients.id, documents.clientId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(documents.createdAt))

    return rows.map((r) => ({
      ...r.doc,
      client: r.client?.id ? r.client : null,
    }))
  })
}

export async function getDocument(
  id: string,
): Promise<DocumentWithClient | null> {
  return withRLS(async (tx) => {
    const rows = await tx
      .select({
        doc: documents,
        client: {
          id: clients.id,
          fullName: clients.fullName,
          avatarUrl: clients.avatarUrl,
        },
      })
      .from(documents)
      .leftJoin(clients, eq(clients.id, documents.clientId))
      .where(eq(documents.id, id))
      .limit(1)
    const row = rows[0]
    if (!row) return null
    return { ...row.doc, client: row.client?.id ? row.client : null }
  })
}

export async function createDocument(input: {
  clientId?: string | null
  name: string
  fileUrl: string
  fileType?: string | null
  fileSize?: number | null
  category?: string | null
  metadata?: Record<string, unknown> | null
}): Promise<Document> {
  const professional = await getProfessional()
  if (!professional) throw new Error("No professional context")
  return withRLS(async (tx) => {
    const [created] = await tx
      .insert(documents)
      .values({
        professionalId: professional.id,
        clientId: input.clientId ?? null,
        uploadedBy: professional.id,
        name: input.name,
        fileUrl: input.fileUrl,
        fileType: input.fileType ?? null,
        fileSize: input.fileSize ?? null,
        category: input.category ?? null,
        metadata: input.metadata ?? null,
      })
      .returning()
    if (!created) throw new Error("Failed to insert document")
    return created
  })
}

// Client-side upload (portal): the client's own uuid is the `uploadedBy` so the
// professional can see who submitted it. The server action enforces that the
// authenticated user actually matches `clientId`.
export async function createDocumentFromClient(input: {
  professionalId: string
  clientId: string
  uploadedBy: string
  name: string
  fileUrl: string
  fileType?: string | null
  fileSize?: number | null
  category?: string | null
}): Promise<Document> {
  return withRLS(async (tx) => {
    const [created] = await tx
      .insert(documents)
      .values({
        professionalId: input.professionalId,
        clientId: input.clientId,
        uploadedBy: input.uploadedBy,
        name: input.name,
        fileUrl: input.fileUrl,
        fileType: input.fileType ?? null,
        fileSize: input.fileSize ?? null,
        category: input.category ?? "General",
      })
      .returning()
    if (!created) throw new Error("Failed to insert document")
    return created
  })
}

export async function deleteDocument(id: string): Promise<Document | null> {
  return withRLS(async (tx) => {
    const [deleted] = await tx
      .delete(documents)
      .where(eq(documents.id, id))
      .returning()
    return deleted ?? null
  })
}

export async function updateDocument(
  id: string,
  patch: Partial<Pick<Document, "name" | "category" | "clientId">>,
): Promise<Document | null> {
  return withRLS(async (tx) => {
    const [row] = await tx
      .update(documents)
      .set(patch)
      .where(eq(documents.id, id))
      .returning()
    return row ?? null
  })
}

// Sum of fileSize across the current professional's documents (in bytes). Used
// for plan-limit enforcement on upload. RLS scopes the query automatically.
export async function getStorageUsedBytes(): Promise<number> {
  return withRLS(async (tx) => {
    const rows = await tx
      .select({ total: sql<number>`coalesce(sum(${documents.fileSize}), 0)::bigint` })
      .from(documents)
    // Postgres BIGINT comes back as string via postgres-js; cast safely.
    const raw = rows[0]?.total ?? 0
    return typeof raw === "string" ? Number.parseInt(raw, 10) : Number(raw)
  })
}

// Distinct categories + file types used by the current professional — powers
// the filter dropdowns on the documents page.
export async function getDocumentFacets(): Promise<{
  categories: string[]
  fileTypes: string[]
}> {
  return withRLS(async (tx) => {
    const [catRows, typeRows] = await Promise.all([
      tx
        .selectDistinct({ category: documents.category })
        .from(documents)
        .where(sql`${documents.category} is not null`),
      tx
        .selectDistinct({ fileType: documents.fileType })
        .from(documents)
        .where(sql`${documents.fileType} is not null`),
    ])
    return {
      categories: catRows
        .map((r) => r.category)
        .filter((c): c is string => Boolean(c)),
      fileTypes: typeRows
        .map((r) => r.fileType)
        .filter((t): t is string => Boolean(t)),
    }
  })
}

// Portal side: documents visible to the current client. RLS does the scoping;
// we order by createdAt and return the file key alongside the row so the
// portal can re-sign URLs on demand.
export async function getClientDocumentsForPortal(
  clientIds: string[],
): Promise<Document[]> {
  if (clientIds.length === 0) return []
  return withRLS(async (tx) => {
    return tx
      .select()
      .from(documents)
      .where(inArray(documents.clientId, clientIds))
      .orderBy(desc(documents.createdAt))
  })
}
