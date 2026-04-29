"use server"

import { z } from "zod"

import { authedAction } from "@/lib/actions/safe-action"
import { openCustomerPortal } from "@/lib/services/billing/open-customer-portal"
import { startCheckout } from "@/lib/services/billing/start-checkout"
// ─────────────────────────────────────────────────────────────────────────────
// Billing actions — thin wrappers that delegate to the billing services.
// Return a URL string; the caller (client component) redirects with
// `window.location.href`.
//
// We intentionally don't use `redirect()` inside the action body: Server
// Actions returning a redirect force a full-page MPA transition, and Stripe
// Checkout URLs must load via `window.location` from a click handler to
// preserve the browser's popup-blocker allowance.
// ─────────────────────────────────────────────────────────────────────────────
const startCheckoutSchema = z.object({
  planId: z.enum(["starter", "growth", "pro"]),
})

export const startCheckoutAction = authedAction
  .metadata({ actionName: "billing.startCheckout" })
  .inputSchema(startCheckoutSchema)
  .action(async ({ parsedInput, ctx }) => {
    return startCheckout(ctx, parsedInput)
  })

export const openCustomerPortalAction = authedAction
  .metadata({ actionName: "billing.openCustomerPortal" })
  .inputSchema(z.object({}).optional())
  .action(async ({ ctx }) => {
    return openCustomerPortal(ctx)
  })
