import "server-only"

import { asc, eq } from "drizzle-orm"

import { withRLS } from "@/lib/db/rls"
import { services } from "@/lib/db/schema"
import type { NewService, Service } from "@/types/domain"

import { getProfessional } from "./professionals"

// ─────────────────────────────────────────────────────────────────────────────
// SERVICES — a professional's bookable / invoiceable offerings.
// All reads/writes RLS-scoped via `withRLS`. Micro-site public lookups live in
// `lib/db/queries/micro-sites.ts` and use `dbAdmin` + the anon select policy.
// ─────────────────────────────────────────────────────────────────────────────

export async function getServices(opts?: {
  activeOnly?: boolean
}): Promise<Service[]> {
  return withRLS(async (tx) => {
    const q = tx.select().from(services)
    if (opts?.activeOnly) {
      return await q
        .where(eq(services.isActive, true))
        .orderBy(asc(services.name))
    }
    return await q.orderBy(asc(services.name))
  })
}

export async function getService(id: string): Promise<Service | null> {
  return withRLS(async (tx) => {
    const rows = await tx
      .select()
      .from(services)
      .where(eq(services.id, id))
      .limit(1)
    return rows[0] ?? null
  })
}

export async function createService(
  input: Omit<NewService, "id" | "createdAt" | "professionalId">,
): Promise<Service | null> {
  const professional = await getProfessional()
  if (!professional) return null
  return withRLS(async (tx) => {
    const rows = await tx
      .insert(services)
      .values({ ...input, professionalId: professional.id })
      .returning()
    return rows[0] ?? null
  })
}

export async function updateService(
  id: string,
  patch: Partial<Omit<NewService, "id" | "professionalId" | "createdAt">>,
): Promise<Service | null> {
  return withRLS(async (tx) => {
    const rows = await tx
      .update(services)
      .set(patch)
      .where(eq(services.id, id))
      .returning()
    return rows[0] ?? null
  })
}

export async function deleteService(id: string): Promise<boolean> {
  return withRLS(async (tx) => {
    const rows = await tx
      .delete(services)
      .where(eq(services.id, id))
      .returning({ id: services.id })
    return rows.length > 0
  })
}

export async function setServiceActive(
  id: string,
  isActive: boolean,
): Promise<Service | null> {
  return updateService(id, { isActive })
}
