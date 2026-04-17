"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ActionError, authedAction } from "@/lib/actions/safe-action"
import { getProfessional } from "@/lib/db/queries/professionals"
import { trackServerEvent } from "@/lib/posthog/events"
import {
  createAutomation as createAutomationQuery,
  deleteAutomation as deleteAutomationQuery,
  getAutomation,
  setAutomationActive,
  updateAutomation as updateAutomationQuery,
} from "@/lib/db/queries/automations"
import {
  evaluateTrigger,
  processAutomationChain,
} from "@/lib/automations/engine"
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

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────
export const createAutomationAction = authedAction
  .metadata({ actionName: "automations.create" })
  .inputSchema(createSchema)
  .action(async ({ parsedInput }) => {
    const row = await createAutomationQuery({
      name: parsedInput.name,
      triggerType: parsedInput.triggerType as TriggerType,
      triggerConfig: (parsedInput.triggerConfig ?? {}) as TriggerConfig,
      actions: parsedInput.actions as AutomationAction[],
      isActive: parsedInput.isActive,
    })

    const professional = await getProfessional()
    if (professional) {
      void trackServerEvent("automation_created", {
        distinctId: professional.clerkUserId,
        professionalId: professional.id,
        plan: professional.plan,
        automationId: row.id,
        triggerType: parsedInput.triggerType,
      })
    }

    revalidatePath("/dashboard/automations")
    return { id: row.id }
  })

export const updateAutomationAction = authedAction
  .metadata({ actionName: "automations.update" })
  .inputSchema(updateSchema)
  .action(async ({ parsedInput }) => {
    const { id, ...rest } = parsedInput
    const patch: Record<string, unknown> = {}
    if (rest.name !== undefined) patch.name = rest.name
    if (rest.triggerType !== undefined) patch.triggerType = rest.triggerType
    if (rest.triggerConfig !== undefined)
      patch.triggerConfig = rest.triggerConfig
    if (rest.actions !== undefined) patch.actions = rest.actions
    if (rest.isActive !== undefined) patch.isActive = rest.isActive
    const row = await updateAutomationQuery(id, patch)
    if (!row) throw new ActionError("Automation not found.")
    revalidatePath("/dashboard/automations")
    revalidatePath(`/dashboard/automations/${id}`)
    return { id: row.id }
  })

export const deleteAutomationAction = authedAction
  .metadata({ actionName: "automations.delete" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput }) => {
    const ok = await deleteAutomationQuery(parsedInput.id)
    if (!ok) throw new ActionError("Automation not found.")
    revalidatePath("/dashboard/automations")
    return { ok: true }
  })

export const toggleAutomationAction = authedAction
  .metadata({ actionName: "automations.toggle" })
  .inputSchema(toggleSchema)
  .action(async ({ parsedInput }) => {
    const row = await setAutomationActive(parsedInput.id, parsedInput.isActive)
    if (!row) throw new ActionError("Automation not found.")
    revalidatePath("/dashboard/automations")
    return { id: row.id, isActive: row.isActive }
  })

// "Run now" — executes the action chain against an ad-hoc target (e.g. a
// single client picked from a dropdown) without waiting for the real trigger.
// Skips `wait` steps since we don't want the pro staring at a spinner for 3
// days. Useful for smoke-testing a freshly-authored automation.
export const runAutomationNowAction = authedAction
  .metadata({ actionName: "automations.runNow" })
  .inputSchema(runNowSchema)
  .action(async ({ parsedInput }) => {
    const row = await getAutomation(parsedInput.id)
    if (!row) throw new ActionError("Automation not found.")
    await processAutomationChain(row.id, parsedInput.targetId ?? null)
    revalidatePath(`/dashboard/automations/${row.id}`)
    return { ok: true }
  })

// Re-exported for the evaluation surface of Session-18 verification. Lets the
// /api/dev/simulate route (or a test) fire a synthetic lead and observe the
// chain fire end-to-end.
export const simulateTriggerAction = authedAction
  .metadata({ actionName: "automations.simulateTrigger" })
  .inputSchema(
    z.object({
      type: z.enum(TRIGGER_TYPES),
      payload: z.record(z.string(), z.unknown()),
    }),
  )
  .action(async ({ ctx, parsedInput }) => {
    // The payload includes the professionalId; we force it to the current
    // user to prevent cross-tenant simulation.
    const payload = {
      ...parsedInput.payload,
      type: parsedInput.type,
      professionalId: ctx.userId, // will be replaced by lookup below
    } as { type: TriggerType; professionalId: string } & Record<string, unknown>

    // Resolve the calling user's professional id. ctx.userId is the Clerk
    // sub, not a row id — evaluateTrigger expects the latter.
    const { dbAdmin } = await import("@/lib/db/client")
    const { professionals } = await import("@/lib/db/schema")
    const { eq } = await import("drizzle-orm")
    const [pro] = await dbAdmin
      .select({ id: professionals.id })
      .from(professionals)
      .where(eq(professionals.clerkUserId, ctx.userId))
      .limit(1)
    if (!pro) throw new ActionError("Professional not found.")
    payload.professionalId = pro.id

    // Narrow type for the engine — caller knows which shape matches.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await evaluateTrigger(parsedInput.type, payload as any)
    revalidatePath(`/dashboard/automations`)
    return result
  })
