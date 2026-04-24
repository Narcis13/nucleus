import type Stripe from "stripe"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { env } from "@/lib/env"
import { stripe } from "@/lib/stripe/client"
import {
  handleCheckoutCompleted,
  handlePaymentFailed,
  handleSubscriptionDeleted,
  handleSubscriptionUpserted,
} from "@/lib/stripe/webhooks"

// ─────────────────────────────────────────────────────────────────────────────
// Stripe webhook endpoint
//
// Stripe sends events with an HMAC signature in the `stripe-signature` header;
// `constructEventAsync` verifies it against STRIPE_WEBHOOK_SECRET and throws
// on tampered payloads or missing/expired signatures. Without the secret we
// reject every request — webhooks cannot run unauthenticated.
//
// Handlers are idempotent (see lib/stripe/webhooks.ts); on error we return
// 500 so Stripe retries. Failures log via console.error with the event id.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: "Stripe webhook secret is not configured" },
      { status: 500 },
    )
  }

  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 })
  }

  const payload = await req.text()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, secret)
  } catch (err) {
    console.error(err, { tags: { webhook: "stripe", stage: "verify" } })
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpserted(event.data.object as Stripe.Subscription)
        break

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        // Unhandled event types are fine — Stripe dashboards narrow the
        // subscription list, but unknown events should still 200 so the
        // dashboard doesn't flag the endpoint as unhealthy.
        break
    }
  } catch (err) {
    console.error(err, {
      tags: { webhook: "stripe", eventType: event.type, eventId: event.id },
    })
    return NextResponse.json({ error: "Handler failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
