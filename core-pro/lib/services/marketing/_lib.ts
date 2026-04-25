import "server-only"

import { getPlan, planLimitsFor } from "@/lib/stripe/plans"
import type { PlanLimits } from "@/types/domain"

// Storage bucket + signed-URL TTL constants shared across the marketing
// service surface.
export const MARKETING_BUCKET = "marketing"
export const LEAD_MAGNET_SIGNED_URL_TTL = 60 * 10 // 10 minutes

export function resolvePlanLimits(
  planLimits: unknown,
  planId: string | null | undefined,
): PlanLimits {
  if (planLimits && typeof planLimits === "object") return planLimits as PlanLimits
  return planLimitsFor(getPlan(planId))
}

// Per-plan email sends per campaign. Belt-and-suspenders with Resend's own
// account limits — we refuse loudly before queueing the batch.
export function maxRecipientsForPlan(planId: string | null | undefined): number {
  switch (planId) {
    case "pro":
      return 2000
    case "growth":
      return 500
    case "enterprise":
      return 10_000
    default:
      return 100
  }
}

export function maxLeadMagnetsForPlan(planId: string | null | undefined): number {
  switch (planId) {
    case "pro":
    case "enterprise":
      return 20
    case "growth":
      return 5
    default:
      return 1
  }
}

export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[\\/]/g, "_")
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
  return cleaned.slice(0, 200) || "untitled"
}
