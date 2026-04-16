"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type Stripe from "stripe"

import {
  getPlan,
  planAtLeast,
  type PlanFeature,
  type PlanId,
} from "@/lib/stripe/plans"

// ─────────────────────────────────────────────────────────────────────────────
// useSubscription
//
// Client-side view of the current professional's billing state. Fetches from
// /api/billing/status, which aggregates Stripe (plan + status) with Postgres
// (usage counters). While the fetch is in flight we optimistically report the
// `starter` tier with zeroed usage so gate components stay lenient (better UX
// than a flashing blocked state).
//
// The hook refetches on `refresh()` — callers use this after Stripe Checkout
// returns to the app so the UI doesn't wait for Clerk metadata propagation.
// ─────────────────────────────────────────────────────────────────────────────

export type SubscriptionSnapshot = {
  plan: PlanId
  status: Stripe.Subscription.Status | "none"
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  usage: {
    clientCount: number
    storageUsedMb: number
  }
}

const DEFAULT_SNAPSHOT: SubscriptionSnapshot = {
  plan: "starter",
  status: "none",
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  usage: { clientCount: 0, storageUsedMb: 0 },
}

export type UseSubscription = {
  isLoaded: boolean
  plan: PlanId
  planName: string
  status: Stripe.Subscription.Status | "none"
  isActive: boolean
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: Date | null
  limits: {
    maxClients: number
    maxStorageMb: number
    features: PlanFeature[]
  }
  usage: {
    clientCount: number
    storageUsedMb: number
    clientsPct: number
    storagePct: number
  }
  canAddClient: boolean
  canUseFeature: (feature: PlanFeature) => boolean
  meetsPlan: (minimum: PlanId) => boolean
  refresh: () => Promise<void>
}

export function useSubscription(): UseSubscription {
  const [isLoaded, setIsLoaded] = useState(false)
  const [snapshot, setSnapshot] = useState<SubscriptionSnapshot>(DEFAULT_SNAPSHOT)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/status", {
        cache: "no-store",
        credentials: "include",
      })
      if (!res.ok) {
        setSnapshot(DEFAULT_SNAPSHOT)
        return
      }
      const data = (await res.json()) as Partial<SubscriptionSnapshot>
      setSnapshot({
        plan: (data.plan as PlanId) ?? "starter",
        status: data.status ?? "none",
        currentPeriodEnd: data.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: !!data.cancelAtPeriodEnd,
        usage: {
          clientCount: data.usage?.clientCount ?? 0,
          storageUsedMb: data.usage?.storageUsedMb ?? 0,
        },
      })
    } finally {
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    void fetchStatus()
  }, [fetchStatus])

  return useMemo(() => {
    const plan = getPlan(snapshot.plan)
    const isActive =
      snapshot.status === "active" ||
      snapshot.status === "trialing" ||
      // Free tier has no subscription but is considered active for UI gating.
      (plan.id === "starter" && snapshot.status === "none")
    const clientsPct = plan.maxClients === Number.POSITIVE_INFINITY
      ? 0
      : Math.min(100, Math.round((snapshot.usage.clientCount / plan.maxClients) * 100))
    const storagePct = plan.maxStorageMb === Number.POSITIVE_INFINITY
      ? 0
      : Math.min(100, Math.round((snapshot.usage.storageUsedMb / plan.maxStorageMb) * 100))

    return {
      isLoaded,
      plan: plan.id,
      planName: plan.name,
      status: snapshot.status,
      isActive,
      cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
      currentPeriodEnd: snapshot.currentPeriodEnd
        ? new Date(snapshot.currentPeriodEnd)
        : null,
      limits: {
        maxClients: plan.maxClients,
        maxStorageMb: plan.maxStorageMb,
        features: plan.features,
      },
      usage: {
        ...snapshot.usage,
        clientsPct,
        storagePct,
      },
      canAddClient: snapshot.usage.clientCount < plan.maxClients,
      canUseFeature: (feature: PlanFeature) => plan.features.includes(feature),
      meetsPlan: (minimum: PlanId) => planAtLeast(plan.id, minimum),
      refresh: fetchStatus,
    }
  }, [snapshot, isLoaded, fetchStatus])
}
