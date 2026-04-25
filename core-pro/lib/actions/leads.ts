"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { authedAction } from "@/lib/actions/safe-action"
import { addLeadActivity } from "@/lib/services/leads/add-activity"
import { convertLeadToClient } from "@/lib/services/leads/convert-to-client"
import { createLead } from "@/lib/services/leads/create"
import { createStage } from "@/lib/services/leads/create-stage"
import { deleteStage } from "@/lib/services/leads/delete-stage"
import { ensureDefaultStages } from "@/lib/services/leads/ensure-default-stages"
import { markLeadLost } from "@/lib/services/leads/mark-lost"
import { moveLeadToStage } from "@/lib/services/leads/move-to-stage"
import { reorderStages } from "@/lib/services/leads/reorder-stages"
import { updateLead } from "@/lib/services/leads/update"
import { updateStage } from "@/lib/services/leads/update-stage"

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
  .action(async ({ parsedInput, ctx }) => {
    return createLead(ctx, parsedInput)
  })

export const updateLeadAction = authedAction
  .metadata({ actionName: "leads.update" })
  .inputSchema(updateLeadSchema)
  .action(async ({ parsedInput, ctx }) => {
    return updateLead(ctx, parsedInput)
  })

export const moveLeadToStageAction = authedAction
  .metadata({ actionName: "leads.move" })
  .inputSchema(moveLeadSchema)
  .action(async ({ parsedInput, ctx }) => {
    // NOTE: deliberately no `revalidatePath` here. The kanban UI is updated
    // optimistically on the client; a rapid move → move-back would otherwise
    // stream two RSC payloads back-to-back and trip a Next 16 chunk-map race
    // (`initializeDebugInfo` / `enqueueModel` crashes). Other lead actions
    // still revalidate — on the next navigation the timeline picks up the
    // new `stage_changed` activity row this move wrote.
    return moveLeadToStage(ctx, parsedInput)
  })

export const addLeadActivityAction = authedAction
  .metadata({ actionName: "leads.addActivity" })
  .inputSchema(addActivitySchema)
  .action(async ({ parsedInput, ctx }) => {
    return addLeadActivity(ctx, parsedInput)
  })

export const convertLeadToClientAction = authedAction
  .metadata({ actionName: "leads.convert" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await convertLeadToClient(ctx, parsedInput)
    // The user is navigated to the client profile after this; refresh the
    // clients list so the new row appears there. The leads page uses local
    // state for optimistic updates, so no leads revalidate here.
    revalidatePath("/dashboard/clients")
    return result
  })

export const markLeadLostAction = authedAction
  .metadata({ actionName: "leads.markLost" })
  .inputSchema(markLostSchema)
  .action(async ({ parsedInput, ctx }) => {
    return markLeadLost(ctx, parsedInput)
  })

// ─────────────────────────────────────────────────────────────────────────────
// Stages
// ─────────────────────────────────────────────────────────────────────────────
export const ensureDefaultStagesAction = authedAction
  .metadata({ actionName: "leads.ensureStages" })
  .inputSchema(z.object({}))
  .action(async ({ parsedInput, ctx }) => {
    return ensureDefaultStages(ctx, parsedInput)
  })

export const createStageAction = authedAction
  .metadata({ actionName: "leads.createStage" })
  .inputSchema(stageInputSchema)
  .action(async ({ parsedInput, ctx }) => {
    return createStage(ctx, parsedInput)
  })

export const updateStageAction = authedAction
  .metadata({ actionName: "leads.updateStage" })
  .inputSchema(stageUpdateSchema)
  .action(async ({ parsedInput, ctx }) => {
    return updateStage(ctx, parsedInput)
  })

export const reorderStagesAction = authedAction
  .metadata({ actionName: "leads.reorderStages" })
  .inputSchema(reorderStagesSchema)
  .action(async ({ parsedInput, ctx }) => {
    return reorderStages(ctx, parsedInput)
  })

export const deleteStageAction = authedAction
  .metadata({ actionName: "leads.deleteStage" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    return deleteStage(ctx, parsedInput)
  })
