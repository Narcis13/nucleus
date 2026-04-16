import "server-only"

import Stripe from "stripe"
import { eq } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { env } from "@/lib/env"
import { professionals } from "@/lib/db/schema"

import { getPlan, type PlanId } from "./plans"

// ─────────────────────────────────────────────────────────────────────────────
// Stripe server SDK — a single shared instance (stripe-node v22+ requires the
// `apiVersion` string; we pin to the version bundled with the SDK so upgrades
// are explicit, and enable `telemetry: false` to avoid sending request metrics
// back to Stripe from our webhook handler).
// ─────────────────────────────────────────────────────────────────────────────
export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  // Pin to the SDK's bundled API version. stripe-node v22+ exposes this as a
  // literal type; changing it should be a deliberate upgrade because response
  // shapes are tied to the version.
  apiVersion: "2026-03-25.dahlia",
  typescript: true,
  telemetry: false,
})

export type SubscriptionStatus = {
  plan: PlanId
  status: Stripe.Subscription.Status | "none"
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
}

// Base URL used for Stripe return/cancel URLs. Prefers the public app URL
// (production) and falls back to the current request host via env.
function appUrl(path: string): string {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}

async function loadProfessional(professionalId: string) {
  const rows = await dbAdmin
    .select()
    .from(professionals)
    .where(eq(professionals.id, professionalId))
    .limit(1)
  return rows[0] ?? null
}

// Ensures the professional row has a Stripe customer, creating one on first
// checkout. Idempotent — if `stripe_customer_id` is already set, returns it.
export async function ensureStripeCustomer(professionalId: string): Promise<string> {
  const pro = await loadProfessional(professionalId)
  if (!pro) {
    throw new Error(`Professional ${professionalId} not found`)
  }
  if (pro.stripeCustomerId) return pro.stripeCustomerId

  const customer = await stripe.customers.create({
    email: pro.email,
    name: pro.fullName,
    metadata: {
      professional_id: pro.id,
      clerk_user_id: pro.clerkUserId,
    },
  })

  await dbAdmin
    .update(professionals)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(professionals.id, professionalId))

  return customer.id
}

// ─────────────────────────────────────────────────────────────────────────────
// createCheckoutSession
//
// Starts a Stripe Checkout session for `planId`. Enterprise ("contact us") is
// rejected here because it has no price id. Returns the hosted Checkout URL
// the caller can redirect to.
// ─────────────────────────────────────────────────────────────────────────────
export async function createCheckoutSession(args: {
  professionalId: string
  planId: PlanId
  successPath?: string
  cancelPath?: string
}): Promise<string> {
  const plan = getPlan(args.planId)
  if (!plan.priceId) {
    throw new Error(
      `Plan "${plan.id}" has no Stripe price id — cannot start Checkout.`,
    )
  }

  const customerId = await ensureStripeCustomer(args.professionalId)

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: appUrl(
      args.successPath ??
        "/dashboard/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}",
    ),
    cancel_url: appUrl(args.cancelPath ?? "/dashboard/settings/billing?checkout=cancelled"),
    allow_promotion_codes: true,
    subscription_data: {
      metadata: {
        professional_id: args.professionalId,
        plan_id: plan.id,
      },
    },
    metadata: {
      professional_id: args.professionalId,
      plan_id: plan.id,
    },
  })

  if (!session.url) {
    throw new Error("Stripe Checkout returned a session without a URL")
  }
  return session.url
}

// ─────────────────────────────────────────────────────────────────────────────
// createCustomerPortalSession
//
// Returns a Billing Portal URL so the professional can update their payment
// method, cancel, or change plan. Requires an existing Stripe customer —
// creates one on the fly if we somehow got here without one.
// ─────────────────────────────────────────────────────────────────────────────
export async function createCustomerPortalSession(args: {
  professionalId: string
  returnPath?: string
}): Promise<string> {
  const customerId = await ensureStripeCustomer(args.professionalId)
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: appUrl(args.returnPath ?? "/dashboard/settings/billing"),
  })
  return session.url
}

// ─────────────────────────────────────────────────────────────────────────────
// getSubscriptionStatus
//
// Reads the professional's current subscription from Stripe as the source of
// truth. The `professionals.plan` column is eventually-consistent via webhook;
// settings/billing uses this helper on load to show authoritative state and
// spot drift.
// ─────────────────────────────────────────────────────────────────────────────
export async function getSubscriptionStatus(
  professionalId: string,
): Promise<SubscriptionStatus> {
  const pro = await loadProfessional(professionalId)
  if (!pro) {
    throw new Error(`Professional ${professionalId} not found`)
  }

  const fallback: SubscriptionStatus = {
    plan: (pro.plan as PlanId) ?? "starter",
    status: "none",
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    stripeCustomerId: pro.stripeCustomerId ?? null,
    stripeSubscriptionId: pro.stripeSubscriptionId ?? null,
  }

  if (!pro.stripeSubscriptionId) return fallback

  try {
    const sub = await stripe.subscriptions.retrieve(pro.stripeSubscriptionId, {
      expand: ["items.data.price"],
    })
    const price = sub.items.data[0]?.price
    const plan = price?.id ? resolvePlanFromPriceId(price.id) : fallback.plan
    const firstItem = sub.items.data[0] as (Stripe.SubscriptionItem & {
      current_period_end?: number | null
    }) | undefined
    const periodEnd = firstItem?.current_period_end ?? null
    return {
      plan,
      status: sub.status,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      stripeCustomerId: pro.stripeCustomerId,
      stripeSubscriptionId: sub.id,
    }
  } catch {
    // If Stripe 404s the subscription (test-mode teardown, manual delete), we
    // fall back to what we have in Postgres rather than blowing up the page.
    return fallback
  }
}

function resolvePlanFromPriceId(priceId: string): PlanId {
  if (priceId === env.STRIPE_STARTER_PRICE_ID) return "starter"
  if (priceId === env.STRIPE_GROWTH_PRICE_ID) return "growth"
  if (priceId === env.STRIPE_PRO_PRICE_ID) return "pro"
  return "starter"
}
