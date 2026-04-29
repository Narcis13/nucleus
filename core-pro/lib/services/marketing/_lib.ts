import "server-only"

import { FEATURE_GATING_ENABLED, getPlan, planLimitsFor } from "@/lib/stripe/plans"
import type { PlanLimits } from "@/types/domain"

// Storage bucket + signed-URL TTL constants shared across the marketing
// service surface.
export const MARKETING_BUCKET = "marketing"
export const LEAD_MAGNET_SIGNED_URL_TTL = 60 * 10 // 10 minutes
// Window the visitor has to click the magic link in their inbox. Long enough
// to find the email + click, short enough that a leaked link goes cold.
export const LEAD_MAGNET_CLAIM_TTL_MS = 30 * 60 * 1000 // 30 minutes

export function resolvePlanLimits(
  planLimits: unknown,
  planId: string | null | undefined,
): PlanLimits {
  if (!FEATURE_GATING_ENABLED) return planLimitsFor(getPlan(planId))
  if (planLimits && typeof planLimits === "object") return planLimits as PlanLimits
  return planLimitsFor(getPlan(planId))
}

// Per-plan email sends per campaign. Belt-and-suspenders with Resend's own
// account limits — we refuse loudly before queueing the batch.
export function maxRecipientsForPlan(planId: string | null | undefined): number {
  if (!FEATURE_GATING_ENABLED) return 10_000
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
  if (!FEATURE_GATING_ENABLED) return 20
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
