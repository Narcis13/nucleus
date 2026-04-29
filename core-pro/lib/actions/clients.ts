"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { authedAction } from "@/lib/actions/safe-action"
import { addTagToClient } from "@/lib/services/clients/add-tag"
import { archiveClient } from "@/lib/services/clients/archive"
import { bulkAddTag } from "@/lib/services/clients/bulk-add-tag"
import { createClient } from "@/lib/services/clients/create"
import { createTag } from "@/lib/services/clients/create-tag"
import { deleteTag } from "@/lib/services/clients/delete-tag"
import { exportClients } from "@/lib/services/clients/export"
import { inviteClientToPortal } from "@/lib/services/clients/invite-portal"
import { removeTagFromClient } from "@/lib/services/clients/remove-tag"
import { resendClientPortalInvite } from "@/lib/services/clients/resend-portal"
import { revokeClientPortalAccess } from "@/lib/services/clients/revoke-portal"
import { updateClient } from "@/lib/services/clients/update"

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────
const clientInputSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email"),
  phone: z.string().max(40).optional().or(z.literal("")),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  locale: z.string().max(10).optional(),
  source: z.string().max(60).optional().or(z.literal("")),
  invite: z.boolean().default(false),
})

const updateClientSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(40).nullable().optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  avatarUrl: z.string().url().nullable().optional(),
  locale: z.string().max(10).optional(),
  // Relationship fields
  status: z.string().max(30).optional(),
  source: z.string().max(60).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
})

const idSchema = z.object({ id: z.string().uuid() })

const tagAssignmentSchema = z.object({
  clientId: z.string().uuid(),
  tagId: z.string().uuid(),
})

const bulkTagSchema = z.object({
  clientIds: z.array(z.string().uuid()).min(1).max(500),
  tagId: z.string().uuid(),
})

const createTagSchema = z.object({
  name: z.string().min(1).max(60),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
})

const exportSchema = z.object({
  clientIds: z.array(z.string().uuid()).optional(),
})

const portalInviteSchema = z.object({
  clientId: z.string().uuid(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────
export const createClientAction = authedAction
  .metadata({ actionName: "clients.create" })
  .inputSchema(clientInputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await createClient(ctx, parsedInput)
    revalidatePath("/dashboard/clients")
    return result
  })

export const updateClientAction = authedAction
  .metadata({ actionName: "clients.update" })
  .inputSchema(updateClientSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await updateClient(ctx, parsedInput)
    revalidatePath("/dashboard/clients")
    revalidatePath(`/dashboard/clients/${parsedInput.id}`)
    return result
  })

export const archiveClientAction = authedAction
  .metadata({ actionName: "clients.archive" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await archiveClient(ctx, parsedInput)
    revalidatePath("/dashboard/clients")
    revalidatePath(`/dashboard/clients/${parsedInput.id}`)
    return result
  })

export const addTagToClientAction = authedAction
  .metadata({ actionName: "clients.addTag" })
  .inputSchema(tagAssignmentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await addTagToClient(ctx, parsedInput)
    revalidatePath("/dashboard/clients")
    revalidatePath(`/dashboard/clients/${parsedInput.clientId}`)
    return result
  })

export const removeTagFromClientAction = authedAction
  .metadata({ actionName: "clients.removeTag" })
  .inputSchema(tagAssignmentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await removeTagFromClient(ctx, parsedInput)
    revalidatePath("/dashboard/clients")
    revalidatePath(`/dashboard/clients/${parsedInput.clientId}`)
    return result
  })

export const bulkAddTagAction = authedAction
  .metadata({ actionName: "clients.bulkAddTag" })
  .inputSchema(bulkTagSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await bulkAddTag(ctx, parsedInput)
    revalidatePath("/dashboard/clients")
    return result
  })

export const createTagAction = authedAction
  .metadata({ actionName: "clients.createTag" })
  .inputSchema(createTagSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await createTag(ctx, parsedInput)
    revalidatePath("/dashboard/clients")
    return result
  })

export const deleteTagAction = authedAction
  .metadata({ actionName: "clients.deleteTag" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await deleteTag(ctx, parsedInput)
    revalidatePath("/dashboard/clients")
    return result
  })

export const exportClientsAction = authedAction
  .metadata({ actionName: "clients.export" })
  .inputSchema(exportSchema)
  .action(async ({ parsedInput, ctx }) => {
    return exportClients(ctx, parsedInput)
  })

// ─────────────────────────────────────────────────────────────────────────────
// Magic-link portal access (Phase 0.5)
// ─────────────────────────────────────────────────────────────────────────────
export const inviteClientToPortalAction = authedAction
  .metadata({ actionName: "clients.invitePortal" })
  .inputSchema(portalInviteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await inviteClientToPortal(ctx, parsedInput)
    revalidatePath("/dashboard/clients")
    revalidatePath(`/dashboard/clients/${parsedInput.clientId}`)
    return result
  })

export const resendClientPortalInviteAction = authedAction
  .metadata({ actionName: "clients.resendPortalInvite" })
  .inputSchema(portalInviteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await resendClientPortalInvite(ctx, parsedInput)
    revalidatePath("/dashboard/clients")
    revalidatePath(`/dashboard/clients/${parsedInput.clientId}`)
    return result
  })

export const revokeClientPortalAccessAction = authedAction
  .metadata({ actionName: "clients.revokePortal" })
  .inputSchema(portalInviteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await revokeClientPortalAccess(ctx, parsedInput)
    revalidatePath("/dashboard/clients")
    revalidatePath(`/dashboard/clients/${parsedInput.clientId}`)
    return result
  })
