import "server-only"

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm"

import { withRLS } from "@/lib/db/rls"
import {
  clients,
  leadActivities,
  leadStages,
  leads,
  professionalClients,
} from "@/lib/db/schema"
import type {
  Lead,
  LeadActivity,
  LeadStage,
  NewLead,
} from "@/types/domain"

import { getProfessional } from "./professionals"

// ─────────────────────────────────────────────────────────────────────────────
// Default stages — seeded the first time a professional opens the pipeline.
// Mirrors the spec: New → Contacted → Qualified → Proposal → Won → Lost.
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_STAGES: Array<{
  name: string
  color: string
  isWon: boolean
  isLost: boolean
}> = [
  { name: "New", color: "#6366f1", isWon: false, isLost: false },
  { name: "Contacted", color: "#0ea5e9", isWon: false, isLost: false },
  { name: "Qualified", color: "#8b5cf6", isWon: false, isLost: false },
  { name: "Proposal", color: "#f59e0b", isWon: false, isLost: false },
  { name: "Won", color: "#22c55e", isWon: true, isLost: false },
  { name: "Lost", color: "#ef4444", isWon: false, isLost: true },
]

export async function ensureDefaultStages(): Promise<LeadStage[]> {
  const professional = await getProfessional()
  if (!professional) throw new Error("No professional context")
  return withRLS(async (tx) => {
    const existing = await tx
      .select()
      .from(leadStages)
      .where(eq(leadStages.professionalId, professional.id))
      .orderBy(asc(leadStages.position))
    if (existing.length > 0) return existing
    const inserted = await tx
      .insert(leadStages)
      .values(
        DEFAULT_STAGES.map((s, idx) => ({
          professionalId: professional.id,
          name: s.name,
          color: s.color,
          position: idx,
          isDefault: idx === 0,
          isWon: s.isWon,
          isLost: s.isLost,
        })),
      )
      .returning()
    return inserted.sort((a, b) => a.position - b.position)
  })
}

export async function getStages(): Promise<LeadStage[]> {
  return withRLS(async (tx) => {
    return tx.select().from(leadStages).orderBy(asc(leadStages.position))
  })
}

export async function getLeads(): Promise<Lead[]> {
  return withRLS(async (tx) => {
    return tx
      .select()
      .from(leads)
      .where(sql`${leads.convertedClientId} is null`)
      .orderBy(desc(leads.createdAt))
  })
}

export async function getLeadsByStage(stageId: string): Promise<Lead[]> {
  return withRLS(async (tx) => {
    return tx.select().from(leads).where(eq(leads.stageId, stageId))
  })
}

export async function getLead(leadId: string): Promise<Lead | null> {
  return withRLS(async (tx) => {
    const rows = await tx
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1)
    return rows[0] ?? null
  })
}

export async function createLead(
  input: Omit<NewLead, "id" | "createdAt" | "updatedAt">,
): Promise<Lead> {
  return withRLS(async (tx) => {
    const [created] = await tx.insert(leads).values(input).returning()
    if (!created) throw new Error("Failed to insert lead")
    await tx.insert(leadActivities).values({
      leadId: created.id,
      type: "created",
      description: "Lead created",
    })
    return created
  })
}

export async function updateLead(
  leadId: string,
  patch: Partial<
    Pick<Lead, "fullName" | "email" | "phone" | "source" | "score" | "notes">
  >,
): Promise<Lead | null> {
  return withRLS(async (tx) => {
    const rows = await tx
      .update(leads)
      .set(patch)
      .where(eq(leads.id, leadId))
      .returning()
    return rows[0] ?? null
  })
}

// Move a lead to a new stage and append an audit row to lead_activities so
// the timeline reflects the change without a separate audit table.
export async function moveLeadToStage(
  leadId: string,
  toStageId: string,
): Promise<Lead | null> {
  return withRLS(async (tx) => {
    const [current] = await tx
      .select({ stageId: leads.stageId })
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1)
    if (current && current.stageId === toStageId) {
      const [unchanged] = await tx
        .select()
        .from(leads)
        .where(eq(leads.id, leadId))
        .limit(1)
      return unchanged ?? null
    }
    const [updated] = await tx
      .update(leads)
      .set({ stageId: toStageId })
      .where(eq(leads.id, leadId))
      .returning()
    if (!updated) return null
    const [fromStage, toStage] = await Promise.all([
      current?.stageId
        ? tx
            .select({ name: leadStages.name })
            .from(leadStages)
            .where(eq(leadStages.id, current.stageId))
            .limit(1)
        : Promise.resolve([]),
      tx
        .select({ name: leadStages.name })
        .from(leadStages)
        .where(eq(leadStages.id, toStageId))
        .limit(1),
    ])
    const fromName = fromStage[0]?.name ?? "—"
    const toName = toStage[0]?.name ?? "—"
    await tx.insert(leadActivities).values({
      leadId,
      type: "stage_changed",
      description: `Stage changed: ${fromName} → ${toName}`,
      metadata: {
        from: current?.stageId ?? null,
        to: toStageId,
      },
    })
    return updated
  })
}

export async function getLeadActivities(
  leadId: string,
): Promise<LeadActivity[]> {
  return withRLS(async (tx) => {
    return tx
      .select()
      .from(leadActivities)
      .where(eq(leadActivities.leadId, leadId))
      .orderBy(desc(leadActivities.createdAt))
  })
}

// Bulk fetch — used by the kanban page so opening the detail panel for any
// lead is instant (no extra request). Returns activities sorted newest-first.
export async function getActivitiesForLeads(
  leadIds: string[],
): Promise<LeadActivity[]> {
  if (leadIds.length === 0) return []
  return withRLS(async (tx) => {
    return tx
      .select()
      .from(leadActivities)
      .where(inArray(leadActivities.leadId, leadIds))
      .orderBy(desc(leadActivities.createdAt))
  })
}

export async function addLeadActivity(input: {
  leadId: string
  type: string
  description?: string | null
  metadata?: Record<string, unknown> | null
}): Promise<LeadActivity> {
  return withRLS(async (tx) => {
    const [created] = await tx
      .insert(leadActivities)
      .values({
        leadId: input.leadId,
        type: input.type,
        description: input.description ?? null,
        metadata: input.metadata ?? null,
      })
      .returning()
    if (!created) throw new Error("Failed to insert activity")
    return created
  })
}

// Convert a lead into a paying client. Creates the client row + professional
// link, sets lead.converted_client_id, moves the lead onto the first "won"
// stage (if one exists) and logs an activity. All inside a single RLS tx.
export async function convertLeadToClient(leadId: string): Promise<{
  clientId: string
  leadId: string
} | null> {
  const professional = await getProfessional()
  if (!professional) throw new Error("No professional context")
  return withRLS(async (tx) => {
    const [lead] = await tx
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1)
    if (!lead) return null
    if (lead.convertedClientId) {
      return { clientId: lead.convertedClientId, leadId: lead.id }
    }
    if (!lead.email) {
      throw new Error("Lead is missing an email — required to create a client.")
    }

    // Pre-generate the id and skip RETURNING. INSERT ... RETURNING re-applies
    // the clients SELECT policy to the new row, which requires a matching
    // professional_clients link — but that link is inserted below, after the
    // client row. RETURNING would therefore trip "new row violates row-level
    // security policy" (42501). Without RETURNING the insert is only gated by
    // WITH CHECK (permissive true), and downstream reads succeed because the
    // junction row exists by then.
    const clientId = crypto.randomUUID()
    await tx.insert(clients).values({
      id: clientId,
      email: lead.email,
      fullName: lead.fullName,
      phone: lead.phone ?? null,
    })

    await tx.insert(professionalClients).values({
      professionalId: professional.id,
      clientId,
      status: "active",
      role: "client",
      source: lead.source ?? "lead",
    })

    const [wonStage] = await tx
      .select()
      .from(leadStages)
      .where(
        and(
          eq(leadStages.professionalId, professional.id),
          eq(leadStages.isWon, true),
        ),
      )
      .orderBy(asc(leadStages.position))
      .limit(1)

    await tx
      .update(leads)
      .set({
        convertedClientId: clientId,
        stageId: wonStage?.id ?? lead.stageId,
      })
      .where(eq(leads.id, leadId))

    await tx.insert(leadActivities).values({
      leadId,
      type: "converted",
      description: "Converted to client",
      metadata: { clientId },
    })

    return { clientId, leadId }
  })
}

// Move a lead onto a "lost" stage with an optional reason logged as activity.
export async function markLeadLost(
  leadId: string,
  reason?: string,
): Promise<Lead | null> {
  const professional = await getProfessional()
  if (!professional) throw new Error("No professional context")
  return withRLS(async (tx) => {
    const [lostStage] = await tx
      .select()
      .from(leadStages)
      .where(
        and(
          eq(leadStages.professionalId, professional.id),
          eq(leadStages.isLost, true),
        ),
      )
      .orderBy(asc(leadStages.position))
      .limit(1)
    if (!lostStage) {
      throw new Error("No 'lost' stage configured. Create one first.")
    }
    const [updated] = await tx
      .update(leads)
      .set({ stageId: lostStage.id })
      .where(eq(leads.id, leadId))
      .returning()
    if (!updated) return null
    await tx.insert(leadActivities).values({
      leadId,
      type: "lost",
      description: reason ? `Marked lost: ${reason}` : "Marked lost",
      metadata: reason ? { reason } : null,
    })
    return updated
  })
}

export async function deleteLead(leadId: string): Promise<boolean> {
  return withRLS(async (tx) => {
    const rows = await tx
      .delete(leads)
      .where(eq(leads.id, leadId))
      .returning({ id: leads.id })
    return rows.length > 0
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage CRUD
// ─────────────────────────────────────────────────────────────────────────────
export async function createStage(input: {
  name: string
  color?: string | null
  isWon?: boolean
  isLost?: boolean
}): Promise<LeadStage> {
  const professional = await getProfessional()
  if (!professional) throw new Error("No professional context")
  return withRLS(async (tx) => {
    const [maxRow] = await tx
      .select({ max: sql<number | null>`max(${leadStages.position})` })
      .from(leadStages)
      .where(eq(leadStages.professionalId, professional.id))
    const nextPos = (maxRow?.max ?? -1) + 1
    const [created] = await tx
      .insert(leadStages)
      .values({
        professionalId: professional.id,
        name: input.name,
        color: input.color ?? "#6366f1",
        position: nextPos,
        isWon: input.isWon ?? false,
        isLost: input.isLost ?? false,
      })
      .returning()
    if (!created) throw new Error("Failed to insert stage")
    return created
  })
}

export async function updateStage(
  stageId: string,
  patch: Partial<
    Pick<LeadStage, "name" | "color" | "position" | "isWon" | "isLost">
  >,
): Promise<LeadStage | null> {
  return withRLS(async (tx) => {
    const rows = await tx
      .update(leadStages)
      .set(patch)
      .where(eq(leadStages.id, stageId))
      .returning()
    return rows[0] ?? null
  })
}

export async function reorderStages(
  ordered: Array<{ id: string; position: number }>,
): Promise<void> {
  if (ordered.length === 0) return
  return withRLS(async (tx) => {
    for (const { id, position } of ordered) {
      await tx
        .update(leadStages)
        .set({ position })
        .where(eq(leadStages.id, id))
    }
  })
}

export async function deleteStage(stageId: string): Promise<{
  deleted: boolean
  reason?: string
}> {
  return withRLS(async (tx) => {
    const [count] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(leads)
      .where(eq(leads.stageId, stageId))
    if ((count?.n ?? 0) > 0) {
      return {
        deleted: false,
        reason: "Stage still has leads — move them first.",
      }
    }
    await tx.delete(leadStages).where(eq(leadStages.id, stageId))
    return { deleted: true }
  })
}
