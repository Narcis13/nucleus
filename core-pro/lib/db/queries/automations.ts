import "server-only"

import { desc, eq, inArray, sql } from "drizzle-orm"

import { withRLS } from "@/lib/db/rls"
import {
  automationLogs,
  automations,
  clients,
  leads,
  professionalClients,
} from "@/lib/db/schema"
import type { Automation, AutomationLog } from "@/types/domain"
import type {
  AutomationAction,
  TriggerConfig,
  TriggerType,
} from "@/lib/automations/types"

import { getProfessional } from "./professionals"

// ─────────────────────────────────────────────────────────────────────────────
// AUTOMATIONS — CRUD + log lookups. All queries go through RLS so access is
// scoped to the current professional automatically.
// ─────────────────────────────────────────────────────────────────────────────

export async function listAutomations(): Promise<
  Array<{ automation: Automation; runs: number; lastRunAt: Date | null }>
> {
  return withRLS(async (tx) => {
    const rows = await tx
      .select({
        automation: automations,
        runs: sql<number>`(
          select count(*)::int from public.automation_logs al
          where al.automation_id = ${automations.id}
        )`,
        lastRunAt: sql<Date | null>`(
          select max(al.executed_at) from public.automation_logs al
          where al.automation_id = ${automations.id}
        )`,
      })
      .from(automations)
      .orderBy(desc(automations.createdAt))
    return rows.map((r) => ({
      automation: r.automation,
      runs: r.runs ?? 0,
      lastRunAt: r.lastRunAt,
    }))
  })
}

export async function getAutomation(id: string): Promise<Automation | null> {
  return withRLS(async (tx) => {
    const rows = await tx
      .select()
      .from(automations)
      .where(eq(automations.id, id))
      .limit(1)
    return rows[0] ?? null
  })
}

export async function createAutomation(input: {
  name: string
  triggerType: TriggerType
  triggerConfig: TriggerConfig
  actions: AutomationAction[]
  isActive?: boolean
}): Promise<Automation> {
  const professional = await getProfessional()
  if (!professional) throw new Error("No professional context")
  return withRLS(async (tx) => {
    const [row] = await tx
      .insert(automations)
      .values({
        professionalId: professional.id,
        name: input.name,
        triggerType: input.triggerType,
        triggerConfig: input.triggerConfig,
        actions: input.actions,
        isActive: input.isActive ?? true,
      })
      .returning()
    if (!row) throw new Error("Failed to insert automation")
    return row
  })
}

export async function updateAutomation(
  id: string,
  patch: Partial<{
    name: string
    triggerType: TriggerType
    triggerConfig: TriggerConfig
    actions: AutomationAction[]
    isActive: boolean
  }>,
): Promise<Automation | null> {
  return withRLS(async (tx) => {
    const rows = await tx
      .update(automations)
      .set(patch)
      .where(eq(automations.id, id))
      .returning()
    return rows[0] ?? null
  })
}

export async function deleteAutomation(id: string): Promise<boolean> {
  return withRLS(async (tx) => {
    const rows = await tx
      .delete(automations)
      .where(eq(automations.id, id))
      .returning({ id: automations.id })
    return rows.length > 0
  })
}

export async function setAutomationActive(
  id: string,
  isActive: boolean,
): Promise<Automation | null> {
  return updateAutomation(id, { isActive })
}

// ─────────────────────────────────────────────────────────────────────────────
// Logs
// ─────────────────────────────────────────────────────────────────────────────
export async function listAutomationLogs(
  automationId: string,
  limit = 100,
): Promise<AutomationLog[]> {
  return withRLS(async (tx) => {
    return tx
      .select()
      .from(automationLogs)
      .where(eq(automationLogs.automationId, automationId))
      .orderBy(desc(automationLogs.executedAt))
      .limit(limit)
  })
}

export async function listRecentLogsForAutomations(
  automationIds: string[],
  perAutomation = 10,
): Promise<AutomationLog[]> {
  if (automationIds.length === 0) return []
  // Simple approach — fetch up to `ids.length * perAutomation` newest rows
  // and let callers filter in-memory. Good enough for a list page.
  return withRLS(async (tx) => {
    return tx
      .select()
      .from(automationLogs)
      .where(inArray(automationLogs.automationId, automationIds))
      .orderBy(desc(automationLogs.executedAt))
      .limit(automationIds.length * perAutomation)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Sample targets — used by the "Run now" picker so the pro can dry-run an
// automation against a real lead/client without waiting for the trigger to
// fire naturally.
// ─────────────────────────────────────────────────────────────────────────────
export type SampleTarget = { id: string; fullName: string; email: string | null }

export async function listSampleTargets(
  limit = 25,
): Promise<{ leads: SampleTarget[]; clients: SampleTarget[] }> {
  return withRLS(async (tx) => {
    const [leadRows, clientRows] = await Promise.all([
      tx
        .select({
          id: leads.id,
          fullName: leads.fullName,
          email: leads.email,
        })
        .from(leads)
        .orderBy(desc(leads.createdAt))
        .limit(limit),
      tx
        .select({
          id: clients.id,
          fullName: clients.fullName,
          email: clients.email,
        })
        .from(professionalClients)
        .innerJoin(clients, eq(clients.id, professionalClients.clientId))
        .orderBy(desc(professionalClients.createdAt))
        .limit(limit),
    ])
    return { leads: leadRows, clients: clientRows }
  })
}
