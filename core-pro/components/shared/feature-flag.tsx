"use client"

import { useFeatureFlagEnabled } from "posthog-js/react"
import type { ReactNode } from "react"

import { useSubscription } from "@/hooks/use-subscription"
import type { PlanFeature, PlanId } from "@/lib/stripe/plans"

// ─────────────────────────────────────────────────────────────────────────────
// <FeatureFlag>
//
// Client-side wrapper that unlocks UI behind a PostHog feature flag plus an
// optional plan gate. Mirrors <PlanGate>: plan is the hard gate (enforced on
// the server), the flag is the incremental rollout knob.
//
// The flag evaluation is "undefined" while PostHog bootstraps — we treat that
// as "not enabled yet" so the flag never flashes in, then out. For flags that
// should default-on during load, wire them via `initialValue` on the provider
// instead of here.
// ─────────────────────────────────────────────────────────────────────────────
export type FeatureFlagProps = {
  flag: string
  children: ReactNode
  fallback?: ReactNode
  // Plan-tier minimum (e.g. "pro"). The flag is ignored when the user's plan
  // doesn't meet this bar — matches the server-side `passesPlanGate` logic.
  minimumPlan?: PlanId
  // Required plan feature instead of a tier. Useful when a flag extends an
  // existing paid capability rather than a whole plan.
  requiresFeature?: PlanFeature
}

export function FeatureFlag({
  flag,
  children,
  fallback = null,
  minimumPlan,
  requiresFeature,
}: FeatureFlagProps) {
  const sub = useSubscription()
  const enabled = useFeatureFlagEnabled(flag)

  if (minimumPlan || requiresFeature) {
    // While we wait for the subscription we keep the feature hidden rather
    // than flashing it — the client hook is optimistic, but for a flag-gated
    // feature we'd rather err conservative.
    if (!sub.isLoaded) return <>{fallback}</>
    if (requiresFeature && !sub.canUseFeature(requiresFeature)) {
      return <>{fallback}</>
    }
    if (minimumPlan && !sub.meetsPlan(minimumPlan)) {
      return <>{fallback}</>
    }
  }

  if (!enabled) return <>{fallback}</>
  return <>{children}</>
}
