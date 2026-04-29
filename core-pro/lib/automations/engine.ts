import "server-only"

import { and, eq, inArray } from "drizzle-orm"

import { logError } from "@/lib/audit/log"
import { dbAdmin } from "@/lib/db/client"
import { env } from "@/lib/env"
import {
  automationLogs,
  automations,
  clientTags,
  clients,
  formAssignments,
  leadStages,
  leads,
  notifications,
  professionalClients,
  professionals,
} from "@/lib/db/schema"
import NotificationEmail from "@/emails/notification"
import {
  expandMergeTags,
  getCampaignTemplate,
} from "@/lib/marketing/templates"
import { resolveProfessionalBrand } from "@/lib/resend/brand"
import { fromAddress, getResend } from "@/lib/resend/client"

import type {
  ActionContext,
  AutomationAction,
  TriggerPayload,
  TriggerType,
} from "./types"

// ─────────────────────────────────────────────────────────────────────────────
// Automation engine — three entry points:
//
//   · evaluateTrigger(type, payload)
//       Called from domain code (leads.create, forms.submit, …). Finds every
//       active automation that matches the trigger type + conditions and
//       enqueues a Trigger.dev chain-runner per match.
//
//   · executeAction(action, context)
//       Runs a single action against its target. Used by the chain-runner
//       between wait steps, but also exposed so the action can be invoked
//       synchronously (e.g. tests, "run now" buttons).
//
//   · processAutomationChain(automationId, targetId)
//       Walks an automation's action list top-to-bottom. Exposed as a helper
//       but the real "walk with delays" lives inside the Trigger.dev task
//       (`trigger/jobs/automation-runner.ts`) so `wait.for({ days: N })` can
//       be used — you cannot await real days from a plain Node module.
//
// All database writes go through `dbAdmin` because the engine runs in
// contexts that are decoupled from a user session (server actions, webhooks,
// cron jobs, Trigger.dev tasks). RLS is enforced at the authoring boundary.
// ─────────────────────────────────────────────────────────────────────────────

// Each log row represents one execution attempt (one automation firing for
// one target). Statuses:
//   · "matched"   — an automation was selected but the chain hasn't kicked
//                   off yet (e.g. Trigger.dev is unconfigured in local dev).
//   · "running"   — chain started; the runner updates this row as it walks.
//   · "completed" — all actions executed without throwing.
//   · "failed"    — an action threw; `error` holds the message.
type LogStatus = "matched" | "running" | "completed" | "failed"

// ─────────────────────────────────────────────────────────────────────────────
// evaluateTrigger
// ─────────────────────────────────────────────────────────────────────────────
export async function evaluateTrigger(
  type: TriggerType,
  payload: TriggerPayload,
): Promise<{ matched: number; enqueued: number }> {
  if (type !== payload.type) {
    throw new Error(
      `evaluateTrigger: mismatched type ${type} vs payload.type ${payload.type}`,
    )
  }

  // Fetch every active automation for the professional + trigger type. The
  // list is small (bounded by what a single pro can author), so filtering
  // conditions in memory keeps the SQL trivial.
  const rows = await dbAdmin
    .select()
    .from(automations)
    .where(
      and(
        eq(automations.professionalId, payload.professionalId),
        eq(automations.triggerType, type),
        eq(automations.isActive, true),
      ),
    )

  if (rows.length === 0) return { matched: 0, enqueued: 0 }

  const targetId = resolveTargetId(payload)

  let matched = 0
  let enqueued = 0
  for (const row of rows) {
    const config = (row.triggerConfig ?? {}) as {
      conditions?: {
        tagIds?: string[]
        planTier?: string | null
        clientStatus?: string | null
        formId?: string | null
        leadSource?: string | null
      }
    }
    const passes = await evaluateConditions(
      config.conditions ?? {},
      payload,
    )
    if (!passes) continue
    matched += 1

    // Write the log row up-front so the UI can show "kicked off at" even if
    // the background worker is slow. The runner flips the status as it goes.
    const [log] = await dbAdmin
      .insert(automationLogs)
      .values({
        automationId: row.id,
        targetId: targetId ?? null,
        status: "matched" satisfies LogStatus,
      })
      .returning()

    const ok = await enqueueChain({
      automationId: row.id,
      logId: log?.id ?? null,
      context: buildContext(payload),
    })
    if (ok) enqueued += 1
  }

  return { matched, enqueued }
}

// ─────────────────────────────────────────────────────────────────────────────
// executeAction — single action runner
// ─────────────────────────────────────────────────────────────────────────────
export async function executeAction(
  action: AutomationAction,
  context: ActionContext,
): Promise<void> {
  switch (action.type) {
    case "send_email":
      await runSendEmail(action, context)
      return
    case "send_notification":
      await runSendNotification(action, context)
      return
    case "assign_form":
      await runAssignForm(action, context)
      return
    case "add_tag":
      await runAddTag(action, context)
      return
    case "remove_tag":
      await runRemoveTag(action, context)
      return
    case "move_lead_to_stage":
      await runMoveLeadToStage(action, context)
      return
    case "create_task":
      await runCreateTask(action, context)
      return
    case "wait":
      // No-op here. Delays are implemented by the Trigger.dev runner which
      // calls `wait.for({ days: N })` between `executeAction` calls. If this
      // function is invoked directly (e.g. "run now" in the UI) we simply
      // skip the wait — the chain advances immediately.
      return
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// processAutomationChain
//
// Walks the action chain synchronously. Used by the "run now" / test paths
// where real multi-day waits are undesirable. The Trigger.dev task has its
// own loop so it can insert `wait.for` between steps.
// ─────────────────────────────────────────────────────────────────────────────
export async function processAutomationChain(
  automationId: string,
  targetId: string | null,
): Promise<void> {
  const [row] = await dbAdmin
    .select()
    .from(automations)
    .where(eq(automations.id, automationId))
    .limit(1)
  if (!row) throw new Error(`automation ${automationId} not found`)

  const actions = parseActions(row.actions)
  // Route the target to the right context slot based on the trigger type so
  // downstream actions (assign_form → clientId, move_lead_to_stage → leadId)
  // resolve correctly even when this is invoked via "Run now".
  const targetsLead = row.triggerType === "new_lead"
  const context: ActionContext = {
    professionalId: row.professionalId,
    clientId: targetsLead ? null : targetId,
    leadId: targetsLead ? targetId : null,
  }

  const [log] = await dbAdmin
    .insert(automationLogs)
    .values({
      automationId: row.id,
      targetId,
      status: "running" satisfies LogStatus,
    })
    .returning()

  try {
    for (const action of actions) {
      await executeAction(action, context)
    }
    if (log?.id) {
      await dbAdmin
        .update(automationLogs)
        .set({ status: "completed" satisfies LogStatus })
        .where(eq(automationLogs.id, log.id))
    }
  } catch (err) {
    logError(err, {
      source: "automation:chain",
      professionalId: context.professionalId,
      metadata: { automationId, logId: log?.id ?? null },
    })
    if (log?.id) {
      await dbAdmin
        .update(automationLogs)
        .set({
          status: "failed" satisfies LogStatus,
          error: err instanceof Error ? err.message : String(err),
        })
        .where(eq(automationLogs.id, log.id))
    }
    throw err
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// internals — condition matching
// ─────────────────────────────────────────────────────────────────────────────
async function evaluateConditions(
  conditions: {
    tagIds?: string[]
    planTier?: string | null
    clientStatus?: string | null
    formId?: string | null
    leadSource?: string | null
  },
  payload: TriggerPayload,
): Promise<boolean> {
  // Form-specific trigger: if the automation is scoped to a particular form,
  // only fire when the submission matches.
  if (
    payload.type === "form_submitted" &&
    conditions.formId &&
    conditions.formId !== payload.formId
  ) {
    return false
  }

  // Plan tier gate — the pro who owns the automation must be on the required
  // plan. This is phrased as a *required* tier so upsell-tied workflows don't
  // accidentally fire for starter accounts after a downgrade.
  if (conditions.planTier) {
    const [pro] = await dbAdmin
      .select({ plan: professionals.plan })
      .from(professionals)
      .where(eq(professionals.id, payload.professionalId))
      .limit(1)
    if (!pro || pro.plan !== conditions.planTier) return false
  }

  // Client-scoped gates — tag filter + relationship status. Only meaningful
  // when the payload actually has a clientId.
  const clientId = resolveClientId(payload)
  if (clientId) {
    if (conditions.clientStatus) {
      const [rel] = await dbAdmin
        .select({ status: professionalClients.status })
        .from(professionalClients)
        .where(
          and(
            eq(professionalClients.professionalId, payload.professionalId),
            eq(professionalClients.clientId, clientId),
          ),
        )
        .limit(1)
      if (!rel || rel.status !== conditions.clientStatus) return false
    }
    if (conditions.tagIds && conditions.tagIds.length > 0) {
      const matched = await dbAdmin
        .select({ id: clientTags.tagId })
        .from(clientTags)
        .where(
          and(
            eq(clientTags.clientId, clientId),
            inArray(clientTags.tagId, conditions.tagIds),
          ),
        )
        .limit(1)
      if (matched.length === 0) return false
    }
  } else if (conditions.tagIds?.length || conditions.clientStatus) {
    // Client-scoped filters requested but no client context — skip.
    return false
  }

  if (
    payload.type === "new_lead" &&
    conditions.leadSource
  ) {
    const [lead] = await dbAdmin
      .select({ source: leads.source })
      .from(leads)
      .where(eq(leads.id, payload.leadId))
      .limit(1)
    if (!lead || lead.source !== conditions.leadSource) return false
  }

  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// internals — chain dispatch
// ─────────────────────────────────────────────────────────────────────────────
async function enqueueChain(args: {
  automationId: string
  logId: string | null
  context: ActionContext
}): Promise<boolean> {
  // Local dev without Trigger.dev: run the chain inline and skip real delays
  // so "new_lead → email → wait 3d → form" still fires the email + form
  // during manual testing. Wait steps are no-ops in this path.
  if (!env.TRIGGER_SECRET_KEY) {
    try {
      await processAutomationChain(
        args.automationId,
        args.context.clientId ?? args.context.leadId ?? null,
      )
      return true
    } catch {
      return false
    }
  }

  try {
    const { tasks } = await import("@trigger.dev/sdk")
    await tasks.trigger("automations.run-chain", {
      automationId: args.automationId,
      logId: args.logId,
      context: args.context,
    })
    return true
  } catch (err) {
    logError(err, {
      source: "automation:enqueue",
      professionalId: args.context.professionalId,
      metadata: { automationId: args.automationId, logId: args.logId },
    })
    return false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// internals — individual action runners
// ─────────────────────────────────────────────────────────────────────────────
async function runSendEmail(
  action: Extract<AutomationAction, { type: "send_email" }>,
  context: ActionContext,
): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const recipient = await resolveEmailRecipient(context)
  if (!recipient) return

  const template = getCampaignTemplate(action.templateKey)
  const [pro] = await dbAdmin
    .select({ fullName: professionals.fullName })
    .from(professionals)
    .where(eq(professionals.id, context.professionalId))
    .limit(1)

  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
  const html = expandMergeTags(template.body, {
    client_name: recipient.fullName,
    professional_name: pro?.fullName ?? null,
    portal_url: `${base}/portal`,
    booking_url: `${base}/portal/calendar`,
  })
  const subject = action.subject?.trim()
    ? action.subject
    : expandMergeTags(template.subject, {
        client_name: recipient.fullName,
        professional_name: pro?.fullName ?? null,
      })

  await resend.emails.send({
    from: fromAddress(),
    to: [recipient.email],
    subject,
    html,
  })
}

async function runSendNotification(
  action: Extract<AutomationAction, { type: "send_notification" }>,
  context: ActionContext,
): Promise<void> {
  // Delivered to the pro's in-app inbox and email (if configured). Uses the
  // same generic notification template marketing/etc. rely on so inbox
  // rendering stays consistent.
  const resend = getResend()

  await dbAdmin.insert(notifications).values({
    userId: context.professionalId,
    userType: "professional",
    type: "system",
    title: action.title,
    body: action.body ?? null,
    link: "/dashboard/automations",
  })

  if (resend) {
    const [pro] = await dbAdmin
      .select({ email: professionals.email, fullName: professionals.fullName })
      .from(professionals)
      .where(eq(professionals.id, context.professionalId))
      .limit(1)
    if (pro?.email) {
      const brand = await resolveProfessionalBrand(context.professionalId)
      await resend.emails.send({
        from: fromAddress(),
        to: [pro.email],
        subject: action.title,
        react: NotificationEmail({
          professionalName: brand?.professionalName ?? pro.fullName,
          branding: brand?.branding ?? null,
          unsubscribeUrl: brand?.unsubscribeUrl,
          locale: brand?.locale,
          recipientName: pro.fullName,
          title: action.title,
          body: action.body ?? null,
          link: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/dashboard/automations`,
          appUrl: brand?.appUrl ?? env.NEXT_PUBLIC_APP_URL,
        }),
      })
    }
  }
}

async function runAssignForm(
  action: Extract<AutomationAction, { type: "assign_form" }>,
  context: ActionContext,
): Promise<void> {
  if (!context.clientId || !action.formId) return
  const dueDate = action.dueDays
    ? new Date(Date.now() + action.dueDays * 24 * 60 * 60 * 1000)
    : null
  await dbAdmin.insert(formAssignments).values({
    formId: action.formId,
    clientId: context.clientId,
    professionalId: context.professionalId,
    dueDate,
  })
}

async function runAddTag(
  action: Extract<AutomationAction, { type: "add_tag" }>,
  context: ActionContext,
): Promise<void> {
  if (!context.clientId) return
  await dbAdmin
    .insert(clientTags)
    .values({ clientId: context.clientId, tagId: action.tagId })
    .onConflictDoNothing()
}

async function runRemoveTag(
  action: Extract<AutomationAction, { type: "remove_tag" }>,
  context: ActionContext,
): Promise<void> {
  if (!context.clientId) return
  await dbAdmin
    .delete(clientTags)
    .where(
      and(
        eq(clientTags.clientId, context.clientId),
        eq(clientTags.tagId, action.tagId),
      ),
    )
}

async function runMoveLeadToStage(
  action: Extract<AutomationAction, { type: "move_lead_to_stage" }>,
  context: ActionContext,
): Promise<void> {
  if (!context.leadId) return
  // Guard: stage must belong to the same professional.
  const [stage] = await dbAdmin
    .select({ id: leadStages.id })
    .from(leadStages)
    .where(
      and(
        eq(leadStages.id, action.stageId),
        eq(leadStages.professionalId, context.professionalId),
      ),
    )
    .limit(1)
  if (!stage) return
  await dbAdmin
    .update(leads)
    .set({ stageId: action.stageId })
    .where(eq(leads.id, context.leadId))
}

async function runCreateTask(
  action: Extract<AutomationAction, { type: "create_task" }>,
  context: ActionContext,
): Promise<void> {
  // MVP "task/reminder" = in-app notification routed to the pro. Good enough
  // for now; a real tasks table can replace this without touching callers.
  await dbAdmin.insert(notifications).values({
    userId: context.professionalId,
    userType: "professional",
    type: "system",
    title: action.title,
    body: action.body ?? null,
    link: "/dashboard/automations",
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────
function resolveTargetId(payload: TriggerPayload): string | null {
  switch (payload.type) {
    case "new_client":
      return payload.clientId
    case "new_lead":
      return payload.leadId
    case "form_submitted":
      return payload.clientId ?? null
    case "appointment_completed":
      return payload.clientId ?? null
    case "client_inactive":
      return payload.clientId
    case "custom_date":
      return payload.clientId
  }
}

function resolveClientId(payload: TriggerPayload): string | null {
  switch (payload.type) {
    case "new_client":
      return payload.clientId
    case "form_submitted":
    case "appointment_completed":
      return payload.clientId ?? null
    case "client_inactive":
    case "custom_date":
      return payload.clientId
    default:
      return null
  }
}

function buildContext(payload: TriggerPayload): ActionContext {
  const base: ActionContext = {
    professionalId: payload.professionalId,
    triggerPayload: payload,
  }
  switch (payload.type) {
    case "new_client":
      return { ...base, clientId: payload.clientId }
    case "new_lead":
      return { ...base, leadId: payload.leadId }
    case "form_submitted":
      return {
        ...base,
        clientId: payload.clientId ?? null,
        formId: payload.formId,
      }
    case "appointment_completed":
      return {
        ...base,
        clientId: payload.clientId ?? null,
        appointmentId: payload.appointmentId,
      }
    case "client_inactive":
    case "custom_date":
      return { ...base, clientId: payload.clientId }
  }
}

async function resolveEmailRecipient(
  context: ActionContext,
): Promise<{ email: string; fullName: string | null } | null> {
  if (context.clientId) {
    const [c] = await dbAdmin
      .select({ email: clients.email, fullName: clients.fullName })
      .from(clients)
      .where(eq(clients.id, context.clientId))
      .limit(1)
    if (c?.email) return { email: c.email, fullName: c.fullName }
  }
  if (context.leadId) {
    const [l] = await dbAdmin
      .select({ email: leads.email, fullName: leads.fullName })
      .from(leads)
      .where(eq(leads.id, context.leadId))
      .limit(1)
    if (l?.email) return { email: l.email, fullName: l.fullName }
  }
  return null
}

// Actions are jsonb — parse + guard once so downstream code can trust the
// shape. We accept what's there and silently drop anything malformed rather
// than failing the whole chain over one bad entry.
export function parseActions(raw: unknown): AutomationAction[] {
  if (!Array.isArray(raw)) return []
  const out: AutomationAction[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue
    const e = entry as { type?: unknown }
    switch (e.type) {
      case "send_email": {
        const v = entry as { templateKey?: unknown; subject?: unknown }
        if (typeof v.templateKey === "string") {
          out.push({
            type: "send_email",
            templateKey: v.templateKey,
            subject: typeof v.subject === "string" ? v.subject : null,
          })
        }
        break
      }
      case "send_notification": {
        const v = entry as { title?: unknown; body?: unknown }
        if (typeof v.title === "string") {
          out.push({
            type: "send_notification",
            title: v.title,
            body: typeof v.body === "string" ? v.body : null,
          })
        }
        break
      }
      case "assign_form": {
        const v = entry as { formId?: unknown; dueDays?: unknown }
        if (typeof v.formId === "string") {
          out.push({
            type: "assign_form",
            formId: v.formId,
            dueDays: typeof v.dueDays === "number" ? v.dueDays : null,
          })
        }
        break
      }
      case "add_tag": {
        const v = entry as { tagId?: unknown }
        if (typeof v.tagId === "string") {
          out.push({ type: "add_tag", tagId: v.tagId })
        }
        break
      }
      case "remove_tag": {
        const v = entry as { tagId?: unknown }
        if (typeof v.tagId === "string") {
          out.push({ type: "remove_tag", tagId: v.tagId })
        }
        break
      }
      case "move_lead_to_stage": {
        const v = entry as { stageId?: unknown }
        if (typeof v.stageId === "string") {
          out.push({ type: "move_lead_to_stage", stageId: v.stageId })
        }
        break
      }
      case "create_task": {
        const v = entry as { title?: unknown; body?: unknown }
        if (typeof v.title === "string") {
          out.push({
            type: "create_task",
            title: v.title,
            body: typeof v.body === "string" ? v.body : null,
          })
        }
        break
      }
      case "wait": {
        const v = entry as { days?: unknown }
        if (typeof v.days === "number" && v.days > 0) {
          out.push({ type: "wait", days: v.days })
        }
        break
      }
    }
  }
  return out
}

