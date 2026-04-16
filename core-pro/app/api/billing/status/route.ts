import { NextResponse } from "next/server"

import { getCurrentProfessionalId } from "@/lib/clerk/helpers"
import { getSubscriptionStatus } from "@/lib/stripe/client"
import { getProfessionalUsage } from "@/lib/stripe/usage"

// Tiny internal endpoint used by `useSubscription` on the client. Keeps Stripe
// calls server-side so the publishable key stays scoped to Checkout.js. 401
// when signed out so callers can distinguish "loading" from "forbidden".
export async function GET() {
  const professionalId = await getCurrentProfessionalId()
  if (!professionalId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [status, usage] = await Promise.all([
    getSubscriptionStatus(professionalId),
    getProfessionalUsage(professionalId),
  ])

  return NextResponse.json({
    plan: status.plan,
    status: status.status,
    currentPeriodEnd: status.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: status.cancelAtPeriodEnd,
    usage,
  })
}
