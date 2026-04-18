import Link from "next/link"
import { redirect } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getCurrentProfessionalId } from "@/lib/clerk/helpers"
import { formatDate } from "@/lib/utils"
import { getSubscriptionStatus } from "@/lib/stripe/client"
import { getPlan, PLAN_ORDER, PLANS } from "@/lib/stripe/plans"
import { getProfessionalUsage } from "@/lib/stripe/usage"

import { BillingActions, UpgradeButton } from "./actions"

// ─────────────────────────────────────────────────────────────────────────────
// /dashboard/settings/billing
//
// Server component — reads the authoritative Stripe subscription + Postgres
// usage, then hands interactive controls to `./actions` (client). The page
// honours a `?plan=...` query param so the /pricing CTA can redirect a freshly
// signed-up user straight into Checkout.
// ─────────────────────────────────────────────────────────────────────────────
type Search = {
  plan?: string
  checkout?: string
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const professionalId = await getCurrentProfessionalId()
  if (!professionalId) {
    redirect("/sign-in?redirect_url=/dashboard/settings/billing")
  }

  const [status, usage, params] = await Promise.all([
    getSubscriptionStatus(professionalId),
    getProfessionalUsage(professionalId),
    searchParams,
  ])

  const plan = getPlan(status.plan)
  const upgradeTargets = PLAN_ORDER.filter((id) => id !== "enterprise" && id !== plan.id)

  return (
    <div className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Manage your plan, payment method, and invoices.
        </p>
      </header>

      {params.checkout === "success" && (
        <Card>
          <CardHeader>
            <CardTitle>Thanks for subscribing!</CardTitle>
            <CardDescription>
              Your new plan is activating now. It may take a moment to reflect
              on this page while Stripe confirms the payment.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current plan</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </div>
            <Badge variant={status.status === "active" || status.status === "trialing" ? "default" : "secondary"}>
              {plan.name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium capitalize">{status.status}</span>
          </div>
          {status.currentPeriodEnd && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">
                {status.cancelAtPeriodEnd ? "Ends on" : "Renews on"}
              </span>
              <span className="font-medium">{formatDate(status.currentPeriodEnd)}</span>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <BillingActions hasCustomer={!!status.stripeCustomerId} />
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>How much of your plan you&rsquo;ve used this period.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <UsageMeter
            label="Active clients"
            used={usage.clientCount}
            limit={plan.maxClients}
            suffix="clients"
          />
          <UsageMeter
            label="Document storage"
            used={usage.storageUsedMb}
            limit={plan.maxStorageMb}
            suffix="MB"
          />
        </CardContent>
      </Card>

      {upgradeTargets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Change plan</CardTitle>
            <CardDescription>
              Upgrade or downgrade at any time — you&rsquo;ll be prorated for the difference.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {upgradeTargets.map((id) => {
              const target = PLANS[id]
              return (
                <Card key={id} size="sm">
                  <CardHeader>
                    <CardTitle>{target.name}</CardTitle>
                    <CardDescription>
                      {target.monthlyPriceEur !== null
                        ? `€${target.monthlyPriceEur}/month`
                        : "Contact sales"}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <UpgradeButton planId={id as "starter" | "growth" | "pro"} />
                  </CardFooter>
                </Card>
              )
            })}
          </CardContent>
          <CardFooter>
            <Button variant="ghost" render={<Link href="/pricing" />}>
              See full comparison
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}

function UsageMeter({
  label,
  used,
  limit,
  suffix,
}: {
  label: string
  used: number
  limit: number
  suffix: string
}) {
  const isUnlimited = limit === Number.POSITIVE_INFINITY
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / limit) * 100))
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {used.toLocaleString()} / {isUnlimited ? "∞" : limit.toLocaleString()} {suffix}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: isUnlimited ? "4%" : `${pct}%` }}
        />
      </div>
    </div>
  )
}
