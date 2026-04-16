"use client"

import { useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  openCustomerPortalAction,
  startCheckoutAction,
} from "@/lib/actions/billing"
import { isPlanId } from "@/lib/stripe/plans"

// ─────────────────────────────────────────────────────────────────────────────
// BillingActions — "Manage billing" opens the Stripe Customer Portal; hidden
// for users without a Stripe customer yet (nothing to manage).
// ─────────────────────────────────────────────────────────────────────────────
export function BillingActions({ hasCustomer }: { hasCustomer: boolean }) {
  const { execute, isExecuting } = useAction(openCustomerPortalAction, {
    onSuccess({ data }) {
      if (data?.url) window.location.href = data.url
    },
    onError({ error }) {
      toast.error(error.serverError ?? "Couldn't open Stripe portal.")
    },
  })

  if (!hasCustomer) {
    return (
      <p className="text-sm text-muted-foreground">
        Upgrade to a paid plan to manage payment methods and invoices.
      </p>
    )
  }

  return (
    <Button disabled={isExecuting} onClick={() => execute({})}>
      {isExecuting ? "Opening…" : "Manage billing"}
    </Button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// UpgradeButton — posts to `startCheckoutAction` and redirects the current
// tab to the returned hosted Checkout URL. Also handles the "sign-up with a
// plan" handoff: when `/pricing` sends a signed-out user through `/sign-up`,
// Clerk returns to `/dashboard/settings/billing?plan=growth`, and this
// component auto-fires the matching plan's checkout once on mount.
// ─────────────────────────────────────────────────────────────────────────────
export function UpgradeButton({
  planId,
}: {
  planId: "starter" | "growth" | "pro"
}) {
  const { execute, isExecuting } = useAction(startCheckoutAction, {
    onSuccess({ data }) {
      if (data?.url) window.location.href = data.url
    },
    onError({ error }) {
      toast.error(error.serverError ?? "Couldn't start checkout.")
    },
  })

  const params = useSearchParams()
  const autoTriggered = useRef(false)

  useEffect(() => {
    if (autoTriggered.current) return
    const requested = params.get("plan")
    if (isPlanId(requested) && requested === planId) {
      autoTriggered.current = true
      execute({ planId })
    }
  }, [params, planId, execute])

  return (
    <Button
      disabled={isExecuting}
      onClick={() => execute({ planId })}
      className="w-full"
    >
      {isExecuting ? "Redirecting…" : "Switch"}
    </Button>
  )
}
