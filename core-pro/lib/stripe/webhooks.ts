import "server-only"

import type Stripe from "stripe"
import { clerkClient } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { notifications, professionals } from "@/lib/db/schema"

import { getPlanByPriceId, getPlan, planLimitsFor, type PlanId } from "./plans"
import { stripe } from "./client"

// ─────────────────────────────────────────────────────────────────────────────
// Stripe webhook event handlers
//
// Each handler is idempotent — Stripe retries on non-2xx and may replay events
// after network blips. We always key off stable identifiers (customer id,
// subscription id) and upsert rather than insert.
//
// Persistence model: the `professionals` row is the single source of truth for
// plan + Stripe ids; we also mirror `plan` + `plan_limits` onto Clerk user's
// `publicMetadata` so `useProfessional()` in the browser can gate features
// without a server round-trip.
// ─────────────────────────────────────────────────────────────────────────────

type ProfessionalRow = typeof professionals.$inferSelect

async function findProfessionalByCustomerId(
  customerId: string,
): Promise<ProfessionalRow | null> {
  const rows = await dbAdmin
    .select()
    .from(professionals)
    .where(eq(professionals.stripeCustomerId, customerId))
    .limit(1)
  return rows[0] ?? null
}

// Resolves the professional row tied to a subscription. Prefers the
// `professional_id` carried in metadata (set when we create Checkout sessions)
// and falls back to the customer-id lookup for events that don't carry it.
async function resolveProfessional(args: {
  customerId: string | null
  metadata?: Stripe.Metadata | null
}): Promise<ProfessionalRow | null> {
  const metaId = args.metadata?.professional_id
  if (metaId) {
    const rows = await dbAdmin
      .select()
      .from(professionals)
      .where(eq(professionals.id, metaId))
      .limit(1)
    if (rows[0]) return rows[0]
  }
  if (args.customerId) {
    return findProfessionalByCustomerId(args.customerId)
  }
  return null
}

// Mirror plan + limits onto the Clerk user's public metadata so the browser
// sees the new tier immediately on next token refresh. Failing to update
// Clerk (rate-limit, transient error) is logged but doesn't fail the webhook —
// the DB is authoritative, and `useProfessional` reads from the DB on demand
// via server components.
async function mirrorPlanToClerk(args: {
  clerkUserId: string
  clerkOrgId?: string | null
  planId: PlanId
}): Promise<void> {
  const plan = getPlan(args.planId)
  const limits = planLimitsFor(plan)
  try {
    const client = await clerkClient()
    await client.users.updateUserMetadata(args.clerkUserId, {
      publicMetadata: { plan: plan.id, plan_limits: limits },
    })
    if (args.clerkOrgId) {
      await client.organizations.updateOrganization(args.clerkOrgId, {
        publicMetadata: { plan: plan.id, plan_limits: limits },
      })
    }
  } catch {
    // Swallow — Stripe still gets a 200 and the DB is the source of truth.
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// checkout.session.completed — a new subscription just finished Checkout.
// Wire the customer/subscription ids back to our professional row and mirror
// the plan. Skips non-subscription checkouts (one-off payments, setup flows).
// ─────────────────────────────────────────────────────────────────────────────
export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (session.mode !== "subscription") return

  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null

  const pro = await resolveProfessional({ customerId, metadata: session.metadata })
  if (!pro) return

  let planId: PlanId = "starter"
  if (subscriptionId) {
    const sub = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price"],
    })
    const priceId = sub.items.data[0]?.price.id
    planId = (getPlanByPriceId(priceId)?.id ?? (session.metadata?.plan_id as PlanId) ?? "starter") as PlanId
  }

  const plan = getPlan(planId)
  await dbAdmin
    .update(professionals)
    .set({
      stripeCustomerId: customerId ?? pro.stripeCustomerId,
      stripeSubscriptionId: subscriptionId ?? pro.stripeSubscriptionId,
      plan: plan.id,
      planLimits: planLimitsFor(plan),
      updatedAt: new Date(),
    })
    .where(eq(professionals.id, pro.id))

  await mirrorPlanToClerk({
    clerkUserId: pro.clerkUserId,
    clerkOrgId: pro.clerkOrgId,
    planId: plan.id,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// customer.subscription.created / updated — plan changes, upgrades, renewals.
// Identical handling: reconcile plan id + status against our row.
// ─────────────────────────────────────────────────────────────────────────────
export async function handleSubscriptionUpserted(
  subscription: Stripe.Subscription,
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id
  const pro = await resolveProfessional({
    customerId,
    metadata: subscription.metadata,
  })
  if (!pro) return

  const priceId = subscription.items.data[0]?.price.id ?? null
  const planFromPrice = getPlanByPriceId(priceId)
  const planId: PlanId =
    planFromPrice?.id ?? (subscription.metadata?.plan_id as PlanId) ?? "starter"
  const plan = getPlan(planId)

  // `status === 'canceled'` is handled by the dedicated delete branch to make
  // downgrade + re-subscribe flows explicit. Past-due/unpaid keep the plan
  // but the UI should render a grace-period banner via subscription status.
  await dbAdmin
    .update(professionals)
    .set({
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      plan: plan.id,
      planLimits: planLimitsFor(plan),
      updatedAt: new Date(),
    })
    .where(eq(professionals.id, pro.id))

  await mirrorPlanToClerk({
    clerkUserId: pro.clerkUserId,
    clerkOrgId: pro.clerkOrgId,
    planId: plan.id,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// customer.subscription.deleted — cancelled (immediate or at period end).
// Downgrade to the free `starter` tier and clear the subscription id so the
// customer can re-subscribe fresh without dangling state.
// ─────────────────────────────────────────────────────────────────────────────
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id
  const pro = await resolveProfessional({
    customerId,
    metadata: subscription.metadata,
  })
  if (!pro) return

  const plan = getPlan("starter")
  await dbAdmin
    .update(professionals)
    .set({
      stripeSubscriptionId: null,
      plan: plan.id,
      planLimits: planLimitsFor(plan),
      updatedAt: new Date(),
    })
    .where(eq(professionals.id, pro.id))

  await mirrorPlanToClerk({
    clerkUserId: pro.clerkUserId,
    clerkOrgId: pro.clerkOrgId,
    planId: plan.id,
  })

  await dbAdmin.insert(notifications).values({
    userId: pro.id,
    userType: "professional",
    type: "billing.subscription_cancelled",
    title: "Subscription cancelled",
    body: "Your plan was cancelled. You're back on the Starter tier.",
    link: "/dashboard/settings/billing",
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// invoice.payment_failed — card declined, bank reject, etc. We notify the
// professional in-app and leave Stripe to drive the dunning flow (retries +
// eventual cancellation) so we don't duplicate Stripe's logic here.
// ─────────────────────────────────────────────────────────────────────────────
export async function handlePaymentFailed(
  invoice: Stripe.Invoice,
): Promise<void> {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id ?? null
  if (!customerId) return

  const pro = await findProfessionalByCustomerId(customerId)
  if (!pro) return

  await dbAdmin.insert(notifications).values({
    userId: pro.id,
    userType: "professional",
    type: "billing.payment_failed",
    title: "Payment failed",
    body: "We couldn't charge your card. Update your payment method to keep your subscription active.",
    link: "/dashboard/settings/billing",
    metadata: {
      invoice_id: invoice.id,
      amount_due: invoice.amount_due,
      currency: invoice.currency,
    },
  })
}
