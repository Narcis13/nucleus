"use server"

import { auth } from "@clerk/nextjs/server"
import { eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ActionError, authedAction } from "@/lib/actions/safe-action"
import { dbAdmin } from "@/lib/db/client"
import {
  createDocument as createDocumentQuery,
  createDocumentFromClient,
  deleteDocument as deleteDocumentQuery,
  getDocument as getDocumentQuery,
  getStorageUsedBytes,
  updateDocument as updateDocumentQuery,
} from "@/lib/db/queries/documents"
import { getProfessional } from "@/lib/db/queries/professionals"
import {
  clients,
  documents,
  professionalClients,
  professionals,
} from "@/lib/db/schema"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { createSupabaseServer } from "@/lib/supabase/server"
import { getPlan, planLimitsFor } from "@/lib/stripe/plans"
import type { PlanLimits } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const BUCKET = "documents"
const SIGNED_URL_TTL_SECONDS = 60 * 60 // 60 minutes — matches plan spec
export const DOCUMENT_CATEGORIES = [
  "General",
  "Contract",
  "Identity",
  "Medical",
  "Financial",
  "Other",
] as const
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number]

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────
function resolvePlanLimits(
  planLimits: unknown,
  planId: string | null | undefined,
): PlanLimits {
  if (planLimits && typeof planLimits === "object") {
    return planLimits as PlanLimits
  }
  return planLimitsFor(getPlan(planId))
}

function mbToBytes(mb: number): number {
  return mb * 1024 * 1024
}

// Safe enough for filenames — strips path separators + control chars, caps
// length. The uuid prefix guarantees uniqueness so we don't need perfect
// slugging.
function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[\\/]/g, "_")
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
  return cleaned.slice(0, 200) || "untitled"
}

// Storage key convention (matches 9901_storage_policies.sql):
//   <professional_id>/<client_id | "general">/<uuid>-<filename>
function buildStorageKey(args: {
  professionalId: string
  clientId?: string | null
  filename: string
}): string {
  const folder = args.clientId ?? "general"
  const id = crypto.randomUUID()
  return `${args.professionalId}/${folder}/${id}-${sanitizeFilename(args.filename)}`
}

// Resolves the signed-in user to a client row (portal side).
async function resolveClient(): Promise<
  { id: string; professionalId: string | null } | null
> {
  const { userId } = await auth()
  if (!userId) return null
  const rows = await dbAdmin
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.clerkUserId, userId))
    .limit(1)
  const client = rows[0]
  if (!client) return null
  // A client can belong to multiple professionals in theory; in our MVP the
  // portal is single-tenant per Clerk org, so pick the first active link.
  const linkRows = await dbAdmin
    .select({ professionalId: professionalClients.professionalId })
    .from(professionalClients)
    .where(eq(professionalClients.clientId, client.id))
    .limit(1)
  return {
    id: client.id,
    professionalId: linkRows[0]?.professionalId ?? null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────
const prepareUploadSchema = z.object({
  filename: z.string().min(1).max(300),
  fileSize: z.number().int().nonnegative().max(250 * 1024 * 1024),
  fileType: z.string().max(100).optional(),
  clientId: z.string().uuid().nullable().optional(),
})

const createDocumentSchema = z.object({
  storageKey: z.string().min(1).max(500),
  name: z.string().min(1).max(300),
  fileSize: z.number().int().nonnegative(),
  fileType: z.string().max(100).optional(),
  category: z.string().max(60).optional(),
  clientId: z.string().uuid().nullable().optional(),
})

const portalCreateDocumentSchema = z.object({
  storageKey: z.string().min(1).max(500),
  name: z.string().min(1).max(300),
  fileSize: z.number().int().nonnegative(),
  fileType: z.string().max(100).optional(),
})

const idSchema = z.object({ id: z.string().uuid() })

const shareSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid().nullable(),
})

const signUrlSchema = z.object({ id: z.string().uuid() })

// ─────────────────────────────────────────────────────────────────────────────
// prepareDocumentUploadAction
//
// Pre-flight check from the dashboard side: validates that the professional
// has plan-storage capacity for the incoming file, and returns the storage
// key the browser should upload to. The browser then does a direct upload via
// the Clerk-authed Supabase client (storage RLS lets it into its own folder).
// ─────────────────────────────────────────────────────────────────────────────
export const prepareDocumentUploadAction = authedAction
  .metadata({ actionName: "documents.prepareUpload" })
  .inputSchema(prepareUploadSchema)
  .action(async ({ parsedInput }) => {
    const professional = await getProfessional()
    if (!professional) {
      throw new ActionError("Complete onboarding before uploading documents.")
    }
    const limits = resolvePlanLimits(professional.planLimits, professional.plan)
    const used = await getStorageUsedBytes()
    const maxBytes = mbToBytes(limits.max_storage_mb)
    if (used + parsedInput.fileSize > maxBytes) {
      throw new ActionError(
        `Storage limit reached (${limits.max_storage_mb} MB). Upgrade your plan to upload more files.`,
      )
    }
    const storageKey = buildStorageKey({
      professionalId: professional.id,
      clientId: parsedInput.clientId ?? null,
      filename: parsedInput.filename,
    })
    return {
      storageKey,
      bucket: BUCKET,
      usedBytes: used,
      maxBytes,
    }
  })

// ─────────────────────────────────────────────────────────────────────────────
// createDocumentAction
//
// Persists the metadata row for a file the browser has already uploaded to
// storage. Runs under RLS so the row's professional_id is implicit. Returns
// the new document's id.
// ─────────────────────────────────────────────────────────────────────────────
export const createDocumentAction = authedAction
  .metadata({ actionName: "documents.create" })
  .inputSchema(createDocumentSchema)
  .action(async ({ parsedInput }) => {
    const professional = await getProfessional()
    if (!professional) throw new ActionError("Unauthorized")

    // Enforce the storage key matches the professional's folder prefix so a
    // client can't swap in another pro's key.
    if (!parsedInput.storageKey.startsWith(`${professional.id}/`)) {
      throw new ActionError("Invalid storage key.")
    }

    const doc = await createDocumentQuery({
      clientId: parsedInput.clientId ?? null,
      name: parsedInput.name,
      fileUrl: parsedInput.storageKey,
      fileType: parsedInput.fileType ?? null,
      fileSize: parsedInput.fileSize,
      category: parsedInput.category ?? "General",
    })

    revalidatePath("/dashboard/documents")
    if (parsedInput.clientId) {
      revalidatePath(`/dashboard/clients/${parsedInput.clientId}`)
      revalidatePath("/portal/documents")
    }
    return { id: doc.id }
  })

// ─────────────────────────────────────────────────────────────────────────────
// portalPrepareDocumentUploadAction
//
// Portal-side counterpart to prepareDocumentUploadAction. The storage key is
// nested under `<professional_id>/<client_id>/...` so the professional's
// storage RLS picks the file up for reads automatically.
// ─────────────────────────────────────────────────────────────────────────────
export const portalPrepareDocumentUploadAction = authedAction
  .metadata({ actionName: "documents.portal.prepareUpload" })
  .inputSchema(
    z.object({
      filename: z.string().min(1).max(300),
      fileSize: z.number().int().nonnegative().max(100 * 1024 * 1024),
      fileType: z.string().max(100).optional(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const client = await resolveClient()
    if (!client || !client.professionalId) {
      throw new ActionError("Unauthorized")
    }

    // Portal uploads count against the professional's storage quota, so we
    // fetch their plan limits (service role — client can't SELECT the pro row
    // directly under RLS) and enforce them here before minting a key.
    const [pro] = await dbAdmin
      .select({
        planLimits: professionals.planLimits,
        plan: professionals.plan,
      })
      .from(professionals)
      .where(eq(professionals.id, client.professionalId))
      .limit(1)
    if (!pro) throw new ActionError("Unauthorized")
    const limits = resolvePlanLimits(pro.planLimits, pro.plan)
    // dbAdmin bypasses RLS; scope the aggregate by professional_id manually.
    const usageRows = await dbAdmin
      .select({
        total: sql<string>`coalesce(sum(${documents.fileSize}), 0)::bigint`,
      })
      .from(documents)
      .where(eq(documents.professionalId, client.professionalId))
    const usedRaw = usageRows[0]?.total ?? "0"
    const used =
      typeof usedRaw === "string" ? Number.parseInt(usedRaw, 10) : Number(usedRaw)
    const maxBytes = mbToBytes(limits.max_storage_mb)
    if (used + parsedInput.fileSize > maxBytes) {
      throw new ActionError(
        "Your professional's storage is full. Ask them to upgrade before uploading new files.",
      )
    }

    const storageKey = buildStorageKey({
      professionalId: client.professionalId,
      clientId: client.id,
      filename: parsedInput.filename,
    })
    return { storageKey, bucket: BUCKET }
  })

// ─────────────────────────────────────────────────────────────────────────────
// portalCreateDocumentAction
//
// Inserts the metadata row for a file the client has uploaded from the portal.
// Bypasses RLS for the insert (service role) because portal-side inserts would
// need the client-insert policy, which requires the storage key to already be
// tied to a row — chicken-and-egg. We do our own authorization instead.
// ─────────────────────────────────────────────────────────────────────────────
export const portalCreateDocumentAction = authedAction
  .metadata({ actionName: "documents.portal.create" })
  .inputSchema(portalCreateDocumentSchema)
  .action(async ({ parsedInput }) => {
    const client = await resolveClient()
    if (!client || !client.professionalId) {
      throw new ActionError("Unauthorized")
    }
    // Storage key must live under the client's folder so the pro (and only the
    // pro) can read it back.
    const expectedPrefix = `${client.professionalId}/${client.id}/`
    if (!parsedInput.storageKey.startsWith(expectedPrefix)) {
      throw new ActionError("Invalid storage key.")
    }

    const doc = await createDocumentFromClient({
      professionalId: client.professionalId,
      clientId: client.id,
      uploadedBy: client.id,
      name: parsedInput.name,
      fileUrl: parsedInput.storageKey,
      fileType: parsedInput.fileType ?? null,
      fileSize: parsedInput.fileSize,
      category: "General",
    })

    revalidatePath("/portal/documents")
    revalidatePath("/dashboard/documents")
    revalidatePath(`/dashboard/clients/${client.id}`)
    return { id: doc.id }
  })

// ─────────────────────────────────────────────────────────────────────────────
// getSignedDocumentUrlAction
//
// Returns a 60-minute signed URL for the given document. RLS on the documents
// table gates *which* rows the caller can see; we then use the admin client to
// mint the URL so clients without storage.objects permissions still get a URL
// for files the DB policy already said they're allowed to read.
// ─────────────────────────────────────────────────────────────────────────────
export const getSignedDocumentUrlAction = authedAction
  .metadata({ actionName: "documents.signedUrl" })
  .inputSchema(signUrlSchema)
  .action(async ({ parsedInput }) => {
    const doc = await getDocumentQuery(parsedInput.id)
    if (!doc) throw new ActionError("Document not found.")

    const admin = getSupabaseAdmin()
    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(doc.fileUrl, SIGNED_URL_TTL_SECONDS, {
        download: doc.name,
      })
    if (error || !data) {
      throw new ActionError(error?.message ?? "Couldn't generate link.")
    }
    return { url: data.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS }
  })

// ─────────────────────────────────────────────────────────────────────────────
// getInlineDocumentUrlAction — same as above but without forcing download, for
// inline preview (images / PDFs in an <iframe>).
// ─────────────────────────────────────────────────────────────────────────────
export const getInlineDocumentUrlAction = authedAction
  .metadata({ actionName: "documents.inlineUrl" })
  .inputSchema(signUrlSchema)
  .action(async ({ parsedInput }) => {
    const doc = await getDocumentQuery(parsedInput.id)
    if (!doc) throw new ActionError("Document not found.")

    const admin = getSupabaseAdmin()
    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(doc.fileUrl, SIGNED_URL_TTL_SECONDS)
    if (error || !data) {
      throw new ActionError(error?.message ?? "Couldn't generate link.")
    }
    return { url: data.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS }
  })

// ─────────────────────────────────────────────────────────────────────────────
// deleteDocumentAction — removes the storage object and DB row atomically.
// If the storage delete fails we surface it, but if the DB row was already
// gone we treat the request as idempotent success.
// ─────────────────────────────────────────────────────────────────────────────
export const deleteDocumentAction = authedAction
  .metadata({ actionName: "documents.delete" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput }) => {
    const doc = await getDocumentQuery(parsedInput.id)
    if (!doc) throw new ActionError("Document not found.")

    // Use user-scoped server client so RLS on storage.objects still applies
    // (a rogue row can't delete another pro's file even if somehow reached).
    const supabase = await createSupabaseServer()
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([doc.fileUrl])
    if (storageError) {
      throw new ActionError(storageError.message)
    }

    await deleteDocumentQuery(parsedInput.id)

    revalidatePath("/dashboard/documents")
    revalidatePath("/portal/documents")
    if (doc.clientId) {
      revalidatePath(`/dashboard/clients/${doc.clientId}`)
    }
    return { id: parsedInput.id }
  })

// ─────────────────────────────────────────────────────────────────────────────
// shareDocumentWithClientAction — sets (or clears) the clientId on an existing
// document row. RLS ensures the caller owns the document.
// ─────────────────────────────────────────────────────────────────────────────
export const shareDocumentWithClientAction = authedAction
  .metadata({ actionName: "documents.share" })
  .inputSchema(shareSchema)
  .action(async ({ parsedInput }) => {
    const updated = await updateDocumentQuery(parsedInput.id, {
      clientId: parsedInput.clientId,
    })
    if (!updated) throw new ActionError("Document not found.")
    revalidatePath("/dashboard/documents")
    revalidatePath("/portal/documents")
    if (parsedInput.clientId) {
      revalidatePath(`/dashboard/clients/${parsedInput.clientId}`)
    }
    return { id: updated.id, clientId: parsedInput.clientId }
  })

// ─────────────────────────────────────────────────────────────────────────────
// renameDocumentAction — rename + optional category re-categorization.
// ─────────────────────────────────────────────────────────────────────────────
export const renameDocumentAction = authedAction
  .metadata({ actionName: "documents.rename" })
  .inputSchema(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(300).optional(),
      category: z.string().max(60).optional(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const patch: Record<string, unknown> = {}
    if (parsedInput.name !== undefined) patch.name = parsedInput.name
    if (parsedInput.category !== undefined) patch.category = parsedInput.category
    if (Object.keys(patch).length === 0) return { id: parsedInput.id }
    const updated = await updateDocumentQuery(parsedInput.id, patch)
    if (!updated) throw new ActionError("Document not found.")
    revalidatePath("/dashboard/documents")
    return { id: updated.id }
  })
