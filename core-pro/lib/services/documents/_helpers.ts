import "server-only"

import { eq } from "drizzle-orm"

import { auth } from "@clerk/nextjs/server"

import { dbAdmin } from "@/lib/db/client"
import { clients, professionalClients } from "@/lib/db/schema"
import { getPlan, planLimitsFor } from "@/lib/stripe/plans"
import type { PlanLimits } from "@/types/domain"

// Storage bucket + signed-URL TTL constants shared across the documents
// service surface.
export const BUCKET = "documents"
export const SIGNED_URL_TTL_SECONDS = 60 * 60 // 60 minutes — matches plan spec

export function resolvePlanLimits(
  planLimits: unknown,
  planId: string | null | undefined,
): PlanLimits {
  if (planLimits && typeof planLimits === "object") {
    return planLimits as PlanLimits
  }
  return planLimitsFor(getPlan(planId))
}

export function mbToBytes(mb: number): number {
  return mb * 1024 * 1024
}

// Safe enough for filenames — strips path separators + control chars, caps
// length. The uuid prefix guarantees uniqueness so we don't need perfect
// slugging.
export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[\\/]/g, "_")
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
  return cleaned.slice(0, 200) || "untitled"
}

// Storage key convention (matches 9901_storage_policies.sql):
//   <professional_id>/<client_id | "general">/<uuid>-<filename>
export function buildStorageKey(args: {
  professionalId: string
  clientId?: string | null
  filename: string
}): string {
  const folder = args.clientId ?? "general"
  const id = crypto.randomUUID()
  return `${args.professionalId}/${folder}/${id}-${sanitizeFilename(args.filename)}`
}

// Resolves the signed-in user to a client row (portal side). Reads through
// `dbAdmin` because RLS on `clients` is keyed off the professional, not the
// client's own Clerk id, so the client can't SELECT themselves directly.
export async function resolveClient(): Promise<
  { id: string; professionalId: string | null } | null
> {
  const { userId } = await auth()
  if (!userId) return null
  const rows = await dbAdmin
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.clerkUserId, userId))
    .limit(1)
  const client = rows[0]
  if (!client) return null
  // A client can belong to multiple professionals in theory; in our MVP the
  // portal is single-tenant per Clerk org, so pick the first active link.
  const linkRows = await dbAdmin
    .select({ professionalId: professionalClients.professionalId })
    .from(professionalClients)
    .where(eq(professionalClients.clientId, client.id))
    .limit(1)
  return {
    id: client.id,
    professionalId: linkRows[0]?.professionalId ?? null,
  }
}
