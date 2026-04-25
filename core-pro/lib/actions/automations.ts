"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { authedAction } from "@/lib/actions/safe-action"
import { createAutomation } from "@/lib/services/automations/create"
import { deleteAutomation } from "@/lib/services/automations/delete"
import { runAutomationNow } from "@/lib/services/automations/run-now"
import { simulateTrigger } from "@/lib/services/automations/simulate-trigger"
import { toggleAutomation } from "@/lib/services/automations/toggle"
import { updateAutomation } from "@/lib/services/automations/update"
import { TRIGGER_TYPES } from "@/lib/automations/types"
import type {
  AutomationAction,
  TriggerConfig,
  TriggerType,
} from "@/lib/automations/types"

// ─────────────────────────────────────────────────────────────────────────────
// Zod schemas — kept in sync with lib/automations/types.ts. Validation errors
// surface to the authoring UI so the pro can correct bad config before save.
// ─────────────────────────────────────────────────────────────────────────────
const actionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("send_email"),
    templateKey: z.string().min(1).max(60),
    subject: z.string().max(200).nullable().optional(),
  }),
  z.object({
    type: z.literal("send_notification"),
    title: z.string().min(1).max(200),
    body: z.string().max(1000).nullable().optional(),
  }),
  z.object({
    type: z.literal("assign_form"),
    formId: z.string().uuid().or(z.literal("")),
    dueDays: z.number().int().min(1).max(365).nullable().optional(),
  }),
  z.object({
    type: z.literal("add_tag"),
    tagId: z.string().uuid(),
  }),
  z.object({
    type: z.literal("remove_tag"),
    tagId: z.string().uuid(),
  }),
  z.object({
    type: z.literal("move_lead_to_stage"),
    stageId: z.string().uuid(),
  }),
  z.object({
    type: z.literal("create_task"),
    title: z.string().min(1).max(200),
    body: z.string().max(1000).nullable().optional(),
  }),
  z.object({
    type: z.literal("wait"),
    days: z.number().int().min(1).max(365),
  }),
])

const conditionsSchema = z
  .object({
    tagIds: z.array(z.string().uuid()).max(20).optional(),
    planTier: z.string().max(30).nullable().optional(),
    clientStatus: z.string().max(30).nullable().optional(),
    formId: z.string().uuid().nullable().optional(),
    leadSource: z.string().max(60).nullable().optional(),
  })
  .optional()

const triggerConfigSchema = z.object({
  conditions: conditionsSchema,
  inactiveDays: z.number().int().min(1).max(365).optional(),
  schedule: z.enum(["daily", "weekly", "monthly"]).optional(),
})

const createSchema = z.object({
  name: z.string().min(1).max(120),
  triggerType: z.enum(TRIGGER_TYPES),
  triggerConfig: triggerConfigSchema,
  actions: z.array(actionSchema).min(1).max(20),
  isActive: z.boolean().optional(),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120).optional(),
  triggerType: z.enum(TRIGGER_TYPES).optional(),
  triggerConfig: triggerConfigSchema.optional(),
  actions: z.array(actionSchema).min(1).max(20).optional(),
  isActive: z.boolean().optional(),
})

const idSchema = z.object({ id: z.string().uuid() })

const toggleSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
})

const runNowSchema = z.object({
  id: z.string().uuid(),
  targetId: z.string().uuid().nullable().optional(),
})

const simulateSchema = z.object({
  type: z.enum(TRIGGER_TYPES),
  payload: z.record(z.string(), z.unknown()),
})

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────
export const createAutomationAction = authedAction
  .metadata({ actionName: "automations.create" })
  .inputSchema(createSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await createAutomation(ctx, {
      name: parsedInput.name,
      triggerType: parsedInput.triggerType as TriggerType,
      triggerConfig: (parsedInput.triggerConfig ?? {}) as TriggerConfig,
      actions: parsedInput.actions as AutomationAction[],
      isActive: parsedInput.isActive,
    })
    revalidatePath("/dashboard/automations")
    return result
  })

export const updateAutomationAction = authedAction
  .metadata({ actionName: "automations.update" })
  .inputSchema(updateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await updateAutomation(ctx, {
      id: parsedInput.id,
      name: parsedInput.name,
      triggerType: parsedInput.triggerType as TriggerType | undefined,
      triggerConfig: parsedInput.triggerConfig as TriggerConfig | undefined,
      actions: parsedInput.actions as AutomationAction[] | undefined,
      isActive: parsedInput.isActive,
    })
    revalidatePath("/dashboard/automations")
    revalidatePath(`/dashboard/automations/${parsedInput.id}`)
    return result
  })

export const deleteAutomationAction = authedAction
  .metadata({ actionName: "automations.delete" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await deleteAutomation(ctx, parsedInput)
    revalidatePath("/dashboard/automations")
    return result
  })

export const toggleAutomationAction = authedAction
  .metadata({ actionName: "automations.toggle" })
  .inputSchema(toggleSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await toggleAutomation(ctx, parsedInput)
    revalidatePath("/dashboard/automations")
    return result
  })

// "Run now" — executes the action chain against an ad-hoc target (e.g. a
// single client picked from a dropdown) without waiting for the real trigger.
// Skips `wait` steps since we don't want the pro staring at a spinner for 3
// days. Useful for smoke-testing a freshly-authored automation.
export const runAutomationNowAction = authedAction
  .metadata({ actionName: "automations.runNow" })
  .inputSchema(runNowSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await runAutomationNow(ctx, parsedInput)
    revalidatePath(`/dashboard/automations/${parsedInput.id}`)
    return result
  })

// Re-exported for the evaluation surface of Session-18 verification. Lets the
// /api/dev/simulate route (or a test) fire a synthetic lead and observe the
// chain fire end-to-end.
export const simulateTriggerAction = authedAction
  .metadata({ actionName: "automations.simulateTrigger" })
  .inputSchema(simulateSchema)
  .action(async ({ ctx, parsedInput }) => {
    const result = await simulateTrigger(ctx, parsedInput)
    revalidatePath(`/dashboard/automations`)
    return result
  })
