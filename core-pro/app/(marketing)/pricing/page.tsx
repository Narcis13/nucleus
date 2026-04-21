import Link from "next/link"
import { getTranslations } from "next-intl/server"

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
export default async function PricingPage() {
  const t = await getTranslations("marketing.pricing")
  const plans = PLAN_ORDER.map((id) => PLANS[id])
  const allFeatures = collectFeatures(plans.flatMap((p) => p.features))

  const humanizeFeature = (f: PlanFeature): string => t(`features.${f}`)

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-heading text-4xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-3 text-base text-muted-foreground">{t("subtitle")}</p>
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
                {plan.highlighted && <Badge>{t("mostPopular")}</Badge>}
              </div>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4 flex items-baseline gap-1">
                {plan.monthlyPriceEur === null ? (
                  <span className="text-3xl font-semibold">{t("custom")}</span>
                ) : (
                  <>
                    <span className="text-4xl font-semibold">
                      €{plan.monthlyPriceEur}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {t("perMonth")}
                    </span>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="text-sm">
              <ul className="space-y-2">
                <li>
                  {plan.maxClients === Number.POSITIVE_INFINITY
                    ? t("activeClientsUnlimited")
                    : t("activeClients", { count: plan.maxClients })}
                </li>
                <li>
                  {plan.maxStorageMb === Number.POSITIVE_INFINITY
                    ? t("documentStorageUnlimited")
                    : t("documentStorage", { mb: plan.maxStorageMb })}
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
                  nativeButton={false}
                  render={<Link href="mailto:sales@corepro.app" />}
                >
                  {t("contactSales")}
                </Button>
              ) : (
                <CheckoutButton planId={plan.id as Exclude<PlanId, "enterprise">} />
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-20">
        <h2 className="font-heading text-2xl font-semibold">
          {t("compareFeatures")}
        </h2>
        <div className="mt-6 overflow-x-auto rounded-xl ring-1 ring-foreground/10">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">{t("featureColumn")}</th>
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
