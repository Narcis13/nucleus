"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  ActionError,
  authedAction,
} from "@/lib/actions/safe-action"
import { evaluateTrigger } from "@/lib/automations/engine"
import {
  addLeadActivity as addLeadActivityQuery,
  convertLeadToClient as convertLeadToClientQuery,
  createLead as createLeadQuery,
  createStage as createStageQuery,
  deleteStage as deleteStageQuery,
  ensureDefaultStages,
  getLead as getLeadQuery,
  getStages,
  markLeadLost as markLeadLostQuery,
  moveLeadToStage as moveLeadToStageQuery,
  reorderStages as reorderStagesQuery,
  updateLead as updateLeadQuery,
  updateStage as updateStageQuery,
} from "@/lib/db/queries/leads"
import { getProfessional } from "@/lib/db/queries/professionals"
import { trackServerEvent } from "@/lib/posthog/events"

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────
const createLeadSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  source: z.string().max(60).optional().or(z.literal("")),
  stageId: z.string().uuid().optional(),
})

const updateLeadSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(1).max(200).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  source: z.string().max(60).nullable().optional(),
  score: z.number().int().min(0).max(100).optional(),
  notes: z.string().max(4000).nullable().optional(),
})

const moveLeadSchema = z.object({
  leadId: z.string().uuid(),
  stageId: z.string().uuid(),
})

const idSchema = z.object({ id: z.string().uuid() })

const addActivitySchema = z.object({
  leadId: z.string().uuid(),
  type: z.enum(["note", "call", "email", "meeting"]),
  description: z.string().min(1).max(2000),
})

const markLostSchema = z.object({
  leadId: z.string().uuid(),
  reason: z.string().max(500).optional(),
})

const stageInputSchema = z.object({
  name: z.string().min(1).max(60),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  isWon: z.boolean().optional(),
  isLost: z.boolean().optional(),
})

const stageUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(60).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  isWon: z.boolean().optional(),
  isLost: z.boolean().optional(),
})

const reorderStagesSchema = z.object({
  ordered: z
    .array(
      z.object({
        id: z.string().uuid(),
        position: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(50),
})

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────
export const createLeadAction = authedAction
  .metadata({ actionName: "leads.create" })
  .inputSchema(createLeadSchema)
  .action(async ({ parsedInput }) => {
    const professional = await getProfessional()
    if (!professional) {
      throw new ActionError("Complete onboarding before adding leads.")
    }

    // The board page seeds defaults on first load, but if a lead is created
    // through some other surface we still need a stage to land on.
    const stages = await ensureDefaultStages()
    const stageId =
      parsedInput.stageId ?? stages[0]?.id
    if (!stageId) {
      throw new ActionError("No pipeline stages available.")
    }

    const created = await createLeadQuery({
      professionalId: professional.id,
      stageId,
      fullName: parsedInput.fullName,
      email: parsedInput.email || null,
      phone: parsedInput.phone || null,
      source: parsedInput.source || null,
    })

    // Fire automations keyed on `new_lead` — best-effort, never blocks the
    // authoring response if Trigger.dev / the engine chokes.
    void evaluateTrigger("new_lead", {
      type: "new_lead",
      professionalId: professional.id,
      leadId: created.id,
    }).catch(() => {})

    void trackServerEvent("lead_created", {
      distinctId: professional.clerkUserId,
      professionalId: professional.id,
      plan: professional.plan,
      leadId: created.id,
      source: parsedInput.source || null,
    })

    return { lead: created }
  })

export const updateLeadAction = authedAction
  .metadata({ actionName: "leads.update" })
  .inputSchema(updateLeadSchema)
  .action(async ({ parsedInput }) => {
    const { id, ...rest } = parsedInput
    const patch: Record<string, unknown> = {}
    if (rest.fullName !== undefined) patch.fullName = rest.fullName
    if (rest.email !== undefined) patch.email = rest.email || null
    if (rest.phone !== undefined) patch.phone = rest.phone || null
    if (rest.source !== undefined) patch.source = rest.source || null
    if (rest.score !== undefined) patch.score = rest.score
    if (rest.notes !== undefined) patch.notes = rest.notes
    const updated = await updateLeadQuery(id, patch)
    if (!updated) throw new ActionError("Lead not found.")
    return { lead: updated }
  })

export const moveLeadToStageAction = authedAction
  .metadata({ actionName: "leads.move" })
  .inputSchema(moveLeadSchema)
  .action(async ({ parsedInput }) => {
    const updated = await moveLeadToStageQuery(
      parsedInput.leadId,
      parsedInput.stageId,
    )
    if (!updated) throw new ActionError("Lead not found.")
    // NOTE: deliberately no `revalidatePath` here. The kanban UI is updated
    // optimistically on the client; a rapid move → move-back would otherwise
    // stream two RSC payloads back-to-back and trip a Next 16 chunk-map race
    // (`initializeDebugInfo` / `enqueueModel` crashes). Other lead actions
    // still revalidate — on the next navigation the timeline picks up the
    // new `stage_changed` activity row this move wrote.
    return { id: updated.id, stageId: updated.stageId }
  })

export const addLeadActivityAction = authedAction
  .metadata({ actionName: "leads.addActivity" })
  .inputSchema(addActivitySchema)
  .action(async ({ parsedInput }) => {
    const activity = await addLeadActivityQuery({
      leadId: parsedInput.leadId,
      type: parsedInput.type,
      description: parsedInput.description,
    })
    return { activity }
  })

export const convertLeadToClientAction = authedAction
  .metadata({ actionName: "leads.convert" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput }) => {
    const professional = await getProfessional()
    const result = await convertLeadToClientQuery(parsedInput.id)
    if (!result) throw new ActionError("Lead not found.")
    if (professional) {
      void trackServerEvent("lead_converted", {
        distinctId: professional.clerkUserId,
        professionalId: professional.id,
        plan: professional.plan,
        leadId: result.leadId,
        clientId: result.clientId,
      })
    }
    // The user is navigated to the client profile after this; refresh the
    // clients list so the new row appears there. The leads page uses local
    // state for optimistic updates, so no leads revalidate here.
    revalidatePath("/dashboard/clients")
    const updatedLead = await getLeadQuery(result.leadId)
    return { ...result, lead: updatedLead }
  })

export const markLeadLostAction = authedAction
  .metadata({ actionName: "leads.markLost" })
  .inputSchema(markLostSchema)
  .action(async ({ parsedInput }) => {
    const updated = await markLeadLostQuery(
      parsedInput.leadId,
      parsedInput.reason,
    )
    if (!updated) throw new ActionError("Lead not found.")
    return { lead: updated }
  })

// ─────────────────────────────────────────────────────────────────────────────
// Stages
// ─────────────────────────────────────────────────────────────────────────────
export const ensureDefaultStagesAction = authedAction
  .metadata({ actionName: "leads.ensureStages" })
  .inputSchema(z.object({}))
  .action(async () => {
    const stages = await ensureDefaultStages()
    return { count: stages.length }
  })

export const createStageAction = authedAction
  .metadata({ actionName: "leads.createStage" })
  .inputSchema(stageInputSchema)
  .action(async ({ parsedInput }) => {
    const created = await createStageQuery({
      name: parsedInput.name,
      color: parsedInput.color,
      isWon: parsedInput.isWon ?? false,
      isLost: parsedInput.isLost ?? false,
    })
    return { stage: created }
  })

export const updateStageAction = authedAction
  .metadata({ actionName: "leads.updateStage" })
  .inputSchema(stageUpdateSchema)
  .action(async ({ parsedInput }) => {
    const { id, ...rest } = parsedInput
    const updated = await updateStageQuery(id, rest)
    if (!updated) throw new ActionError("Stage not found.")
    return { stage: updated }
  })

export const reorderStagesAction = authedAction
  .metadata({ actionName: "leads.reorderStages" })
  .inputSchema(reorderStagesSchema)
  .action(async ({ parsedInput }) => {
    await reorderStagesQuery(parsedInput.ordered)
    return { ok: true }
  })

export const deleteStageAction = authedAction
  .metadata({ actionName: "leads.deleteStage" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput }) => {
    const stages = await getStages()
    if (stages.length <= 1) {
      throw new ActionError("Keep at least one stage.")
    }
    const result = await deleteStageQuery(parsedInput.id)
    if (!result.deleted) {
      throw new ActionError(result.reason ?? "Couldn't delete stage.")
    }
    return { id: parsedInput.id }
  })
