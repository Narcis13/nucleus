import "server-only"

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

