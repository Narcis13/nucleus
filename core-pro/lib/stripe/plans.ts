import { env } from "@/lib/env"

// ─────────────────────────────────────────────────────────────────────────────
// Plans catalogue — the single source of truth for Stripe price IDs, plan
// limits, and feature flags. Consumed by:
//   - /pricing page (marketing)                    → plan comparison table
//   - /dashboard/settings/billing                  → usage meters + CTAs
//   - useSubscription hook                         → canAddClient / canUseFeature
//   - Stripe webhook handler                       → mirror plan + limits onto
//                                                    the professionals row
//
// When a new plan is added here, also add the matching Stripe price id to
// `STRIPE_<NAME>_PRICE_ID` env vars and regenerate the price→plan reverse map.
// ─────────────────────────────────────────────────────────────────────────────

export type PlanId = "starter" | "growth" | "pro" | "enterprise"

export type PlanFeature =
  | "crm"
  | "lead_pipeline"
  | "messaging"
  | "calendar"
  | "forms"
  | "documents"
  | "notifications"
  | "invoicing"
  | "micro_site"
  | "marketing_kit"
  | "automations"
  | "analytics"
  | "custom_branding"
  | "priority_support"
  | "sso"

export type Plan = {
  id: PlanId
  name: string
  description: string
  // Stripe price id — null for enterprise (contact sales) and null in dev when
  // the env var is unset (we still want the app to boot without Stripe keys).
  priceId: string | null
  // Monthly price displayed on /pricing (EUR). Null signals "contact us".
  monthlyPriceEur: number | null
  maxClients: number
  maxStorageMb: number
  features: PlanFeature[]
  highlighted?: boolean
}

const STARTER_FEATURES: PlanFeature[] = [
  "crm",
  "messaging",
  "calendar",
  "forms",
  "documents",
  "notifications",
  "invoicing",
]

const GROWTH_FEATURES: PlanFeature[] = [
  ...STARTER_FEATURES,
  "lead_pipeline",
  "micro_site",
  "marketing_kit",
]

const PRO_FEATURES: PlanFeature[] = [
  ...GROWTH_FEATURES,
  "automations",
  "analytics",
  "custom_branding",
]

const ENTERPRISE_FEATURES: PlanFeature[] = [
  ...PRO_FEATURES,
  "priority_support",
  "sso",
]

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: "starter",
    name: "Starter",
    description: "For individuals just getting started.",
    priceId: env.STRIPE_STARTER_PRICE_ID ?? null,
    monthlyPriceEur: 19,
    maxClients: 15,
    maxStorageMb: 500,
    features: STARTER_FEATURES,
  },
  growth: {
    id: "growth",
    name: "Growth",
    description: "For professionals scaling beyond the basics.",
    priceId: env.STRIPE_GROWTH_PRICE_ID ?? null,
    monthlyPriceEur: 49,
    maxClients: 50,
    maxStorageMb: 2000,
    features: GROWTH_FEATURES,
    highlighted: true,
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For established practices with automation needs.",
    priceId: env.STRIPE_PRO_PRICE_ID ?? null,
    monthlyPriceEur: 99,
    maxClients: 150,
    maxStorageMb: 5000,
    features: PRO_FEATURES,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "For teams and high-volume practices.",
    priceId: null,
    monthlyPriceEur: null,
    maxClients: Number.POSITIVE_INFINITY,
    maxStorageMb: Number.POSITIVE_INFINITY,
    features: ENTERPRISE_FEATURES,
  },
}

export const PLAN_ORDER: PlanId[] = ["starter", "growth", "pro", "enterprise"]

// Boilerplate stage: feature gating is OFF so every CRM surface is reachable
// without a Stripe subscription. Flip to `true` (or rip out the bypass paths
// that read it) when verticals start enforcing plan tiers.
export const FEATURE_GATING_ENABLED = false

export function isPlanId(value: string | null | undefined): value is PlanId {
  return !!value && (PLAN_ORDER as readonly string[]).includes(value)
}

export function getPlan(id: string | null | undefined): Plan {
  return isPlanId(id) ? PLANS[id] : PLANS.starter
}

// Reverse lookup used by the webhook handler: given a Stripe price id from the
// subscription payload, return the plan it maps to. Returns null when the
// price belongs to a plan we don't know about — lets the webhook stay
// forgiving during price-id rollouts.
export function getPlanByPriceId(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null
  for (const plan of Object.values(PLANS)) {
    if (plan.priceId && plan.priceId === priceId) return plan
  }
  return null
}

// Shape persisted to `professionals.plan_limits` (jsonb) and mirrored onto
// Clerk publicMetadata so the client can read limits without a DB round trip.
//
// JSON.stringify turns Infinity into `null`, which would poison downstream
// comparisons (`usage < limit` becomes false for every value). We normalise
// Infinity to a huge finite integer so serialised limits stay meaningful.
const UNLIMITED = Number.MAX_SAFE_INTEGER

export function planLimitsFor(plan: Plan): {
  max_clients: number
  max_storage_mb: number
  features: string[]
} {
  if (!FEATURE_GATING_ENABLED) {
    return {
      max_clients: UNLIMITED,
      max_storage_mb: UNLIMITED,
      features: ENTERPRISE_FEATURES,
    }
  }
  return {
    max_clients: Number.isFinite(plan.maxClients) ? plan.maxClients : UNLIMITED,
    max_storage_mb: Number.isFinite(plan.maxStorageMb) ? plan.maxStorageMb : UNLIMITED,
    features: plan.features,
  }
}

// True when `a` is at least as permissive as `b` (same or higher tier).
export function planAtLeast(a: PlanId, b: PlanId): boolean {
  return PLAN_ORDER.indexOf(a) >= PLAN_ORDER.indexOf(b)
}
