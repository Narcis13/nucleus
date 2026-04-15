import { NextResponse } from "next/server"

export async function POST() {
  // TODO: Stripe webhook handler (subscription lifecycle) — SESSION 5
  return NextResponse.json({ received: true })
}
