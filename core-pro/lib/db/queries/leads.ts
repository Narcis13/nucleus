import "server-only"

import { and, asc, eq } from "drizzle-orm"

import { withRLS } from "@/lib/db/rls"
import { leadActivities, leadStages, leads } from "@/lib/db/schema"
import type { Lead, NewLead } from "@/types/domain"

export async function getLeads() {
  return withRLS(async (tx) => {
    return tx
      .select({
        lead: leads,
        stage: leadStages,
      })
      .from(leads)
      .leftJoin(leadStages, eq(leadStages.id, leads.stageId))
      .orderBy(asc(leadStages.position))
  })
}

export async function getLeadsByStage(stageId: string): Promise<Lead[]> {
  return withRLS(async (tx) => {
    return tx
      .select()
      .from(leads)
      .where(eq(leads.stageId, stageId))
  })
}

export async function getStages() {
  return withRLS(async (tx) => {
    return tx
      .select()
      .from(leadStages)
      .orderBy(asc(leadStages.position))
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

// Move + audit. The activity row gives us a free history we can render in the
// pipeline UI without a separate audit table.
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
    const [updated] = await tx
      .update(leads)
      .set({ stageId: toStageId })
      .where(eq(leads.id, leadId))
      .returning()
    if (!updated) return null
    await tx.insert(leadActivities).values({
      leadId,
      type: "stage_changed",
      description: `Stage changed`,
      metadata: {
        from: current?.stageId ?? null,
        to: toStageId,
      },
    })
    return updated
  })
}

export async function getLeadActivities(leadId: string) {
  return withRLS(async (tx) => {
    return tx
      .select()
      .from(leadActivities)
      .where(eq(leadActivities.leadId, leadId))
      .orderBy(asc(leadActivities.createdAt))
  })
}

// Convenience used during conversion to a paying client.
export async function markLeadConverted(
  leadId: string,
  convertedClientId: string,
) {
  return withRLS(async (tx) => {
    return tx
      .update(leads)
      .set({ convertedClientId })
      .where(and(eq(leads.id, leadId)))
      .returning()
  })
}
