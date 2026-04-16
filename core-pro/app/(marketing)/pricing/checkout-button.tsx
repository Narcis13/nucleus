"use client"

import { useAuth } from "@clerk/nextjs"
import Link from "next/link"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { startCheckoutAction } from "@/lib/actions/billing"
import type { PlanId } from "@/lib/stripe/plans"

// ─────────────────────────────────────────────────────────────────────────────
// <CheckoutButton>
//
// Kicks off the Stripe Checkout flow for a priced plan. For visitors who
// aren't signed in we route to sign-up with the plan carried in the return
// URL so /dashboard/settings/billing can auto-open Checkout on arrival.
// ─────────────────────────────────────────────────────────────────────────────
export function CheckoutButton({
  planId,
}: {
  planId: Exclude<PlanId, "enterprise">
}) {
  const { isSignedIn, isLoaded } = useAuth()
  const { execute, isExecuting } = useAction(startCheckoutAction, {
    onSuccess({ data }) {
      if (data?.url) {
        window.location.href = data.url
      }
    },
    onError({ error }) {
      toast.error(error.serverError ?? "Couldn't start checkout.")
    },
  })

  if (!isLoaded || !isSignedIn) {
    const redirectUrl = `/dashboard/settings/billing?plan=${planId}`
    return (
      <Button
        className="w-full"
        render={
          <Link
            href={{
              pathname: "/sign-up/[[...sign-up]]",
              query: { redirect_url: redirectUrl },
            }}
          />
        }
      >
        Get started
      </Button>
    )
  }

  return (
    <Button
      className="w-full"
      disabled={isExecuting}
      onClick={() => execute({ planId })}
    >
      {isExecuting ? "Starting checkout…" : "Upgrade"}
    </Button>
  )
}
