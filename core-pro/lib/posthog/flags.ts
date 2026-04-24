import "server-only"

import { getPostHogServer } from "@/lib/posthog/server"
import { getPlan, planAtLeast, type PlanFeature, type PlanId } from "@/lib/stripe/plans"

// ─────────────────────────────────────────────────────────────────────────────
// Feature flag registry — the set of flag keys the app knows how to ask
// PostHog about. Keeping them typed prevents the usual flag-key typo drift
// between code and dashboard.
//
// `new_ui_*` is open-ended by design: the marketing team ships UI variants
// under that namespace constantly, and we don't want a code change every time.
// ─────────────────────────────────────────────────────────────────────────────
export type FeatureFlag =
  | "ai_features"
  | "advanced_automations"
  | "white_label"
  | `new_ui_${string}`

export const FEATURE_FLAGS = {
  ai_features: "ai_features",
  advanced_automations: "advanced_automations",
  white_label: "white_label",
} as const

// When PostHog isn't configured we fall back to these defaults so local dev
// and preview deploys keep working. Production should drive decisions from
// the dashboard, not this map.
const FALLBACK_DEFAULTS: Record<string, boolean> = {
  ai_features: false,
  advanced_automations: false,
  white_label: false,
}

// Every gated feature requires at least this plan before the flag even gets
// evaluated. The flag + plan combination is the hard gate: a flag can roll
// out a feature to a subset of eligible users, but it can't grant access to
// a plan tier that doesn't include it. Plan is the source of truth; the
// flag is the incremental rollout knob.
const PLAN_REQUIREMENTS: Partial<Record<FeatureFlag, PlanId>> = {
  ai_features: "pro",
  advanced_automations: "pro",
  white_label: "pro",
}

// Plan features that must be present before the flag gate unlocks. Used when
// the flag is about extending an existing paid feature rather than gating a
// whole tier. Optional — not every flag needs one.
const FEATURE_REQUIREMENTS: Partial<Record<FeatureFlag, PlanFeature>> = {
  advanced_automations: "automations",
  white_label: "custom_branding",
}

export type FlagEvaluationInput = {
  userId: string
  planId?: PlanId | null
  // Optional org/team grouping — if present, PostHog can evaluate a flag
  // against an organization-scoped rollout.
  orgId?: string | null
  // Short-circuit when the caller already knows the plan is insufficient.
  // Defaults to running the full plan + flag check.
  skipPlanCheck?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// isFeatureEnabled
//
// Canonical server-side check. Returns `false` when:
//   - The flag isn't registered.
//   - The user's plan doesn't meet the feature's minimum tier / missing feature.
//   - PostHog says no (or the SDK isn't configured and fallback is false).
//
// Never throws: flag evaluation failures degrade to the fallback default so a
// PostHog outage doesn't take the app down.
// ─────────────────────────────────────────────────────────────────────────────
export async function isFeatureEnabled(
  flag: FeatureFlag,
  input: FlagEvaluationInput,
): Promise<boolean> {
  if (!input.skipPlanCheck && !passesPlanGate(flag, input.planId ?? null)) {
    return false
  }

  const client = getPostHogServer()
  if (!client) {
    return FALLBACK_DEFAULTS[flag] ?? false
  }

  try {
    const result = await client.isFeatureEnabled(flag, input.userId, {
      groups: input.orgId ? { organization: input.orgId } : undefined,
    })
    return result === true
  } catch (err) {
    console.error(err, { tags: { module: "posthog", flag } })
    return FALLBACK_DEFAULTS[flag] ?? false
  }
}

// Same shape as `isFeatureEnabled` but returns the variant string/boolean/null
// as-is — lets callers distinguish between "off", "on", and "variant-B" rollouts.
export async function getFeatureFlagValue(
  flag: FeatureFlag,
  input: FlagEvaluationInput,
): Promise<string | boolean | null> {
  if (!input.skipPlanCheck && !passesPlanGate(flag, input.planId ?? null)) {
    return false
  }

  const client = getPostHogServer()
  if (!client) {
    return FALLBACK_DEFAULTS[flag] ?? false
  }

  try {
    const value = await client.getFeatureFlag(flag, input.userId, {
      groups: input.orgId ? { organization: input.orgId } : undefined,
    })
    return value ?? false
  } catch (err) {
    console.error(err, { tags: { module: "posthog", flag } })
    return FALLBACK_DEFAULTS[flag] ?? false
  }
}

// Exposed so callers who already know their user is ineligible (e.g. the
// settings page hiding a beta toggle for starter plans) can skip the PostHog
// round-trip entirely.
export function passesPlanGate(
  flag: FeatureFlag,
  planId: PlanId | null | undefined,
): boolean {
  const minPlan = PLAN_REQUIREMENTS[flag]
  const requiredFeature = FEATURE_REQUIREMENTS[flag]

  if (!minPlan && !requiredFeature) return true

  const plan = getPlan(planId ?? undefined)
  if (minPlan && !planAtLeast(plan.id, minPlan)) return false
  if (requiredFeature && !plan.features.includes(requiredFeature)) return false
  return true
}
