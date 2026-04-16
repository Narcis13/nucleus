"use client"

import Link from "next/link"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useSubscription } from "@/hooks/use-subscription"
import { getPlan, type PlanFeature, type PlanId } from "@/lib/stripe/plans"

// ─────────────────────────────────────────────────────────────────────────────
// <PlanGate>
//
// Wraps a feature that's gated behind either a minimum plan tier (e.g.
// `minimumPlan="pro"`) or a specific feature flag (`feature="automations"`).
// While the subscription is loading we render the children optimistically —
// the server action or RLS policy is the hard enforcement boundary, so the UI
// gate is purely informational.
//
// Render priority:
//   1. loading                   → children (optimistic)
//   2. meets requirement         → children
//   3. `fallback` prop provided  → fallback
//   4. default upgrade card with CTA → /dashboard/settings/billing
// ─────────────────────────────────────────────────────────────────────────────
export type PlanGateProps = {
  children: ReactNode
  // Minimum plan required. Ignored when `feature` is set.
  minimumPlan?: PlanId
  // Feature flag required — checked against the current plan's feature list.
  feature?: PlanFeature
  // Custom node to render when the gate is closed. Overrides the default card.
  fallback?: ReactNode
  // When true, returns null instead of an upgrade CTA (for purely decorative
  // UI sections like "export to CSV" buttons that should vanish, not nag).
  hideWhenLocked?: boolean
}

export function PlanGate({
  children,
  minimumPlan,
  feature,
  fallback,
  hideWhenLocked,
}: PlanGateProps) {
  const sub = useSubscription()

  if (!sub.isLoaded) return <>{children}</>

  const allowed = feature ? sub.canUseFeature(feature) : minimumPlan ? sub.meetsPlan(minimumPlan) : true

  if (allowed) return <>{children}</>
  if (hideWhenLocked) return null
  if (fallback) return <>{fallback}</>

  const requiredPlan = feature
    ? describeFeaturePlan(feature)
    : minimumPlan
      ? getPlan(minimumPlan).name
      : "a higher plan"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upgrade to unlock</CardTitle>
        <CardDescription>
          This feature is available on the {requiredPlan} plan and above.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <Button render={<Link href="/dashboard/settings/billing" />}>
          Upgrade plan
        </Button>
        <Button
          variant="ghost"
          render={<Link href="/pricing" />}
        >
          Compare plans
        </Button>
      </CardContent>
    </Card>
  )
}

function describeFeaturePlan(feature: PlanFeature): string {
  // Walk plans starting at the cheapest and return the name of the first that
  // includes the feature. Keeps the upgrade prompt specific ("Pro plan")
  // instead of generic ("a higher plan").
  const order: PlanId[] = ["starter", "growth", "pro", "enterprise"]
  for (const id of order) {
    const plan = getPlan(id)
    if (plan.features.includes(feature)) return plan.name
  }
  return "a higher plan"
}
