"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getCurrentProfessionalId } from "@/lib/clerk/helpers"
import { inviteClient as clerkInviteClient } from "@/lib/clerk/helpers"
import {
  ActionError,
  authedAction,
} from "@/lib/actions/safe-action"
import { evaluateTrigger } from "@/lib/automations/engine"
import {
  addTagToClient as addTagToClientQuery,
  addTagToClients as addTagToClientsQuery,
  archiveClient as archiveClientQuery,
  countActiveClients,
  createClient as createClientQuery,
  createTag as createTagQuery,
  deleteTag as deleteTagQuery,
  getClientsByIds,
  removeTagFromClient as removeTagFromClientQuery,
  updateClient as updateClientQuery,
  updateRelationship,
} from "@/lib/db/queries/clients"
import { getProfessional } from "@/lib/db/queries/professionals"
import { trackServerEvent } from "@/lib/posthog/events"
import { getPlan, planLimitsFor } from "@/lib/stripe/plans"
import type { PlanLimits } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// `plan_limits` is persisted as jsonb (Professional["planLimits"]) and can be
// null on older rows. Fall back to the plan's built-in limits so enforcement
// still works before the webhook backfills the column.
function resolvePlanLimits(
  planLimits: unknown,
  planId: string | null | undefined,
): PlanLimits {
  if (planLimits && typeof planLimits === "object") {
    return planLimits as PlanLimits
  }
  return planLimitsFor(getPlan(planId))
}

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

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────
export const createClientAction = authedAction
  .metadata({ actionName: "clients.create" })
  .inputSchema(clientInputSchema)
  .action(async ({ parsedInput }) => {
    const professional = await getProfessional()
    if (!professional) {
      throw new ActionError("Complete onboarding before adding clients.")
    }

    // Plan-limit enforcement — count active links and reject before the insert
    // so we never leave a half-created client behind.
    const limits = resolvePlanLimits(professional.planLimits, professional.plan)
    const active = await countActiveClients()
    if (active >= limits.max_clients) {
      throw new ActionError(
        `Your ${professional.plan} plan allows up to ${limits.max_clients} active clients. Upgrade to add more.`,
      )
    }

    const created = await createClientQuery(
      {
        email: parsedInput.email,
        fullName: parsedInput.fullName,
        phone: parsedInput.phone || null,
        dateOfBirth: parsedInput.dateOfBirth || null,
        locale: parsedInput.locale ?? "ro",
      },
      { source: parsedInput.source || undefined },
    )

    // Clerk org invite — best-effort. We don't fail the action if Clerk is
    // unreachable; the professional can re-trigger the invite from the
    // profile page. The matching `clients.clerk_user_id` will be populated by
    // the `organizationMembership.created` webhook when the invite is accepted.
    let invited = false
    if (parsedInput.invite && professional.clerkOrgId) {
      try {
        await clerkInviteClient({
          email: parsedInput.email,
          professionalId: professional.id,
          clerkOrgId: professional.clerkOrgId,
          inviterUserId: professional.clerkUserId,
        })
        invited = true
      } catch {
        // Swallow; surfaced via `invited: false` in the response.
      }
    }

    void evaluateTrigger("new_client", {
      type: "new_client",
      professionalId: professional.id,
      clientId: created.id,
    }).catch(() => {})

    void trackServerEvent("client_added", {
      distinctId: professional.clerkUserId,
      professionalId: professional.id,
      plan: professional.plan,
      clientId: created.id,
      invited,
      source: parsedInput.source || null,
    })

    revalidatePath("/dashboard/clients")
    return { id: created.id, invited }
  })

export const updateClientAction = authedAction
  .metadata({ actionName: "clients.update" })
  .inputSchema(updateClientSchema)
  .action(async ({ parsedInput }) => {
    const { id, status, source, notes, ...rest } = parsedInput

    // Only send fields that were actually provided — undefined fields are
    // skipped by Drizzle's .set(), but we also filter empty strings to null.
    const clientPatch: Record<string, unknown> = {}
    if (rest.fullName !== undefined) clientPatch.fullName = rest.fullName
    if (rest.email !== undefined) clientPatch.email = rest.email
    if (rest.phone !== undefined) clientPatch.phone = rest.phone || null
    if (rest.dateOfBirth !== undefined)
      clientPatch.dateOfBirth = rest.dateOfBirth || null
    if (rest.avatarUrl !== undefined) clientPatch.avatarUrl = rest.avatarUrl
    if (rest.locale !== undefined) clientPatch.locale = rest.locale

    let updatedClient = null
    if (Object.keys(clientPatch).length > 0) {
      updatedClient = await updateClientQuery(id, clientPatch)
    }

    const relationshipPatch: Record<string, unknown> = {}
    if (status !== undefined) relationshipPatch.status = status
    if (source !== undefined) relationshipPatch.source = source
    if (notes !== undefined) relationshipPatch.notes = notes
    if (Object.keys(relationshipPatch).length > 0) {
      await updateRelationship(id, relationshipPatch)
    }

    revalidatePath("/dashboard/clients")
    revalidatePath(`/dashboard/clients/${id}`)
    return { id, updated: Boolean(updatedClient) || Object.keys(relationshipPatch).length > 0 }
  })

export const archiveClientAction = authedAction
  .metadata({ actionName: "clients.archive" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput }) => {
    const professionalId = await getCurrentProfessionalId()
    if (!professionalId) {
      throw new ActionError("Unauthorized")
    }
    const archived = await archiveClientQuery(parsedInput.id)
    if (!archived) {
      throw new ActionError("Client not found or already archived.")
    }
    revalidatePath("/dashboard/clients")
    revalidatePath(`/dashboard/clients/${parsedInput.id}`)
    return { id: parsedInput.id }
  })

export const addTagToClientAction = authedAction
  .metadata({ actionName: "clients.addTag" })
  .inputSchema(tagAssignmentSchema)
  .action(async ({ parsedInput }) => {
    await addTagToClientQuery(parsedInput.clientId, parsedInput.tagId)
    revalidatePath("/dashboard/clients")
    revalidatePath(`/dashboard/clients/${parsedInput.clientId}`)
    return { ok: true }
  })

export const removeTagFromClientAction = authedAction
  .metadata({ actionName: "clients.removeTag" })
  .inputSchema(tagAssignmentSchema)
  .action(async ({ parsedInput }) => {
    await removeTagFromClientQuery(parsedInput.clientId, parsedInput.tagId)
    revalidatePath("/dashboard/clients")
    revalidatePath(`/dashboard/clients/${parsedInput.clientId}`)
    return { ok: true }
  })

export const bulkAddTagAction = authedAction
  .metadata({ actionName: "clients.bulkAddTag" })
  .inputSchema(bulkTagSchema)
  .action(async ({ parsedInput }) => {
    const added = await addTagToClientsQuery(
      parsedInput.clientIds,
      parsedInput.tagId,
    )
    revalidatePath("/dashboard/clients")
    return { added }
  })

export const createTagAction = authedAction
  .metadata({ actionName: "clients.createTag" })
  .inputSchema(createTagSchema)
  .action(async ({ parsedInput }) => {
    const tag = await createTagQuery(parsedInput)
    revalidatePath("/dashboard/clients")
    return { tag }
  })

export const deleteTagAction = authedAction
  .metadata({ actionName: "clients.deleteTag" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput }) => {
    await deleteTagQuery(parsedInput.id)
    revalidatePath("/dashboard/clients")
    return { ok: true }
  })

// CSV export — returns the payload as a data URL string. The client then
// triggers a download via an anchor. Keeping this server-side means the data
// never leaves the RLS sandbox and columns stay consistent.
export const exportClientsAction = authedAction
  .metadata({ actionName: "clients.export" })
  .inputSchema(exportSchema)
  .action(async ({ parsedInput }) => {
    const clientIds = parsedInput.clientIds ?? []
    const rows = clientIds.length > 0 ? await getClientsByIds(clientIds) : []
    const csv = toCsv(rows)
    return { filename: "clients.csv", csv }
  })

function toCsv(
  rows: Array<{
    client: { fullName: string; email: string; phone: string | null; createdAt: Date }
    relationship: { status: string; source: string | null }
    tags: Array<{ name: string }>
  }>,
): string {
  const header = ["Name", "Email", "Phone", "Status", "Source", "Tags", "Created"]
  const escape = (v: string | null | undefined): string => {
    if (v === null || v === undefined) return ""
    if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`
    return v
  }
  const body = rows.map((r) =>
    [
      escape(r.client.fullName),
      escape(r.client.email),
      escape(r.client.phone),
      escape(r.relationship.status),
      escape(r.relationship.source),
      escape(r.tags.map((t) => t.name).join(", ")),
      escape(r.client.createdAt.toISOString()),
    ].join(","),
  )
  return [header.join(","), ...body].join("\n")
}
