import Link from "next/link"

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
import { PLAN_ORDER, PLANS, type PlanFeature, type PlanId } from "@/lib/stripe/plans"

import { CheckoutButton } from "./checkout-button"

// ─────────────────────────────────────────────────────────────────────────────
// /pricing — marketing-facing comparison of the four tiers. Each priced plan
// renders a <CheckoutButton>; Enterprise links to sales. Feature rows are
// derived from the union of every plan's feature list so new features show
// up automatically on this table.
// ─────────────────────────────────────────────────────────────────────────────
export default function PricingPage() {
  const plans = PLAN_ORDER.map((id) => PLANS[id])
  const allFeatures = collectFeatures(plans.flatMap((p) => p.features))

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-heading text-4xl font-semibold tracking-tight">
          Simple, transparent pricing
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Start free, scale as your practice grows. Cancel anytime.
        </p>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={plan.highlighted ? "ring-2 ring-primary" : undefined}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                {plan.highlighted && <Badge>Most popular</Badge>}
              </div>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4 flex items-baseline gap-1">
                {plan.monthlyPriceEur === null ? (
                  <span className="text-3xl font-semibold">Custom</span>
                ) : (
                  <>
                    <span className="text-4xl font-semibold">
                      €{plan.monthlyPriceEur}
                    </span>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="text-sm">
              <ul className="space-y-2">
                <li>
                  <strong>
                    {plan.maxClients === Number.POSITIVE_INFINITY
                      ? "Unlimited"
                      : plan.maxClients}
                  </strong>{" "}
                  active clients
                </li>
                <li>
                  <strong>
                    {plan.maxStorageMb === Number.POSITIVE_INFINITY
                      ? "Unlimited"
                      : `${plan.maxStorageMb} MB`}
                  </strong>{" "}
                  document storage
                </li>
                {plan.features.slice(-3).map((f) => (
                  <li key={f}>{humanizeFeature(f)}</li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {plan.id === "enterprise" ? (
                <Button
                  className="w-full"
                  render={<Link href="mailto:sales@corepro.app" />}
                >
                  Contact sales
                </Button>
              ) : (
                <CheckoutButton planId={plan.id as Exclude<PlanId, "enterprise">} />
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-20">
        <h2 className="font-heading text-2xl font-semibold">Compare features</h2>
        <div className="mt-6 overflow-x-auto rounded-xl ring-1 ring-foreground/10">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Feature</th>
                {plans.map((p) => (
                  <th key={p.id} className="px-4 py-3 font-medium">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allFeatures.map((feature) => (
                <tr key={feature} className="border-t">
                  <td className="px-4 py-3">{humanizeFeature(feature)}</td>
                  {plans.map((p) => (
                    <td key={p.id} className="px-4 py-3">
                      {p.features.includes(feature) ? "✓" : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function collectFeatures(xs: PlanFeature[]): PlanFeature[] {
  return Array.from(new Set(xs))
}

function humanizeFeature(f: PlanFeature): string {
  switch (f) {
    case "crm":
      return "Client CRM"
    case "lead_pipeline":
      return "Lead pipeline (Kanban)"
    case "messaging":
      return "In-app messaging"
    case "calendar":
      return "Calendar & scheduling"
    case "forms":
      return "Form builder"
    case "documents":
      return "Document management"
    case "notifications":
      return "Notifications"
    case "invoicing":
      return "Invoicing"
    case "micro_site":
      return "Public micro-site"
    case "marketing_kit":
      return "Marketing kit"
    case "automations":
      return "Automations"
    case "analytics":
      return "Analytics dashboard"
    case "custom_branding":
      return "Custom branding"
    case "priority_support":
      return "Priority support"
    case "sso":
      return "SSO / SAML"
  }
}
