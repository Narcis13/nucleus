"use server"

import { z } from "zod"

import { getCurrentProfessionalId } from "@/lib/clerk/helpers"
import {
  ActionError,
  authedAction,
} from "@/lib/actions/safe-action"
import {
  createCheckoutSession,
  createCustomerPortalSession,
} from "@/lib/stripe/client"
// ─────────────────────────────────────────────────────────────────────────────
// Billing actions — thin wrappers that resolve the current professional and
// then delegate to `lib/stripe/client.ts`. Return a URL string; the caller
// (client component) redirects with `window.location.href`.
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
  .action(async ({ parsedInput }) => {
    const professionalId = await getCurrentProfessionalId()
    if (!professionalId) {
      throw new ActionError("No professional profile found for your account.")
    }
    const url = await createCheckoutSession({
      professionalId,
      planId: parsedInput.planId,
    })
    return { url }
  })

export const openCustomerPortalAction = authedAction
  .metadata({ actionName: "billing.openCustomerPortal" })
  .inputSchema(z.object({}).optional())
  .action(async () => {
    const professionalId = await getCurrentProfessionalId()
    if (!professionalId) {
      throw new ActionError("No professional profile found for your account.")
    }
    const url = await createCustomerPortalSession({ professionalId })
    return { url }
  })
