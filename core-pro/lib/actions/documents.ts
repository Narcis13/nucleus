"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { authedAction } from "@/lib/actions/safe-action"
import { createDocument } from "@/lib/services/documents/create"
import { deleteDocument } from "@/lib/services/documents/delete"
import { getInlineDocumentUrl } from "@/lib/services/documents/get-inline-url"
import { getSignedDocumentUrl } from "@/lib/services/documents/get-signed-url"
import { portalCreateDocument } from "@/lib/services/documents/portal-create"
import { portalPrepareDocumentUpload } from "@/lib/services/documents/portal-prepare-upload"
import { prepareDocumentUpload } from "@/lib/services/documents/prepare-upload"
import { renameDocument } from "@/lib/services/documents/rename"
import { shareDocumentWithClient } from "@/lib/services/documents/share-with-client"

// ─────────────────────────────────────────────────────────────────────────────
// Schemas (transport-layer parsing — services receive typed, pre-validated input)
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
// prepareDocumentUploadAction — pre-flight plan-storage check that mints the
// storage key the browser uploads to.
// ─────────────────────────────────────────────────────────────────────────────
export const prepareDocumentUploadAction = authedAction
  .metadata({ actionName: "documents.prepareUpload" })
  .inputSchema(prepareUploadSchema)
  .action(async ({ parsedInput, ctx }) => {
    return prepareDocumentUpload(ctx, parsedInput)
  })

// ─────────────────────────────────────────────────────────────────────────────
// createDocumentAction — persists the metadata row for a file the browser has
// already uploaded to storage.
// ─────────────────────────────────────────────────────────────────────────────
export const createDocumentAction = authedAction
  .metadata({ actionName: "documents.create" })
  .inputSchema(createDocumentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await createDocument(ctx, parsedInput)
    revalidatePath("/dashboard/documents")
    if (parsedInput.clientId) {
      revalidatePath(`/dashboard/clients/${parsedInput.clientId}`)
      revalidatePath("/portal/documents")
    }
    return result
  })

// ─────────────────────────────────────────────────────────────────────────────
// portalPrepareDocumentUploadAction — portal-side counterpart that scopes the
// storage key under the client's folder.
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
  .action(async ({ parsedInput, ctx }) => {
    return portalPrepareDocumentUpload(ctx, parsedInput)
  })

// ─────────────────────────────────────────────────────────────────────────────
// portalCreateDocumentAction — inserts the metadata row for a file uploaded
// from the portal.
// ─────────────────────────────────────────────────────────────────────────────
export const portalCreateDocumentAction = authedAction
  .metadata({ actionName: "documents.portal.create" })
  .inputSchema(portalCreateDocumentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await portalCreateDocument(ctx, parsedInput)
    revalidatePath("/portal/documents")
    revalidatePath("/dashboard/documents")
    revalidatePath(`/dashboard/clients/${result.clientId}`)
    return { id: result.id }
  })

// ─────────────────────────────────────────────────────────────────────────────
// getSignedDocumentUrlAction — 60-minute signed URL that forces download.
// ─────────────────────────────────────────────────────────────────────────────
export const getSignedDocumentUrlAction = authedAction
  .metadata({ actionName: "documents.signedUrl" })
  .inputSchema(signUrlSchema)
  .action(async ({ parsedInput, ctx }) => {
    return getSignedDocumentUrl(ctx, parsedInput)
  })

// ─────────────────────────────────────────────────────────────────────────────
// getInlineDocumentUrlAction — same as above without forcing download, for
// inline preview (images / PDFs in an <iframe>).
// ─────────────────────────────────────────────────────────────────────────────
export const getInlineDocumentUrlAction = authedAction
  .metadata({ actionName: "documents.inlineUrl" })
  .inputSchema(signUrlSchema)
  .action(async ({ parsedInput, ctx }) => {
    return getInlineDocumentUrl(ctx, parsedInput)
  })

// ─────────────────────────────────────────────────────────────────────────────
// deleteDocumentAction — removes the storage object and DB row atomically.
// ─────────────────────────────────────────────────────────────────────────────
export const deleteDocumentAction = authedAction
  .metadata({ actionName: "documents.delete" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await deleteDocument(ctx, parsedInput)
    revalidatePath("/dashboard/documents")
    revalidatePath("/portal/documents")
    if (result.clientId) {
      revalidatePath(`/dashboard/clients/${result.clientId}`)
    }
    return { id: result.id }
  })

// ─────────────────────────────────────────────────────────────────────────────
// shareDocumentWithClientAction — sets (or clears) the clientId on an existing
// document row.
// ─────────────────────────────────────────────────────────────────────────────
export const shareDocumentWithClientAction = authedAction
  .metadata({ actionName: "documents.share" })
  .inputSchema(shareSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await shareDocumentWithClient(ctx, parsedInput)
    revalidatePath("/dashboard/documents")
    revalidatePath("/portal/documents")
    if (parsedInput.clientId) {
      revalidatePath(`/dashboard/clients/${parsedInput.clientId}`)
    }
    return result
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
  .action(async ({ parsedInput, ctx }) => {
    const result = await renameDocument(ctx, parsedInput)
    revalidatePath("/dashboard/documents")
    return result
  })
