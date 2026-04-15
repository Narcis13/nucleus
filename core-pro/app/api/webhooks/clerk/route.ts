import { NextResponse } from "next/server"

export async function POST() {
  // TODO: Clerk webhook handler (user.created, user.updated) — SESSION 4
  return NextResponse.json({ received: true })
}
