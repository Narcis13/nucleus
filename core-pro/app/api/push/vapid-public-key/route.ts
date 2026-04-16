import { NextResponse } from "next/server"

// Serves the VAPID public key to the browser so it can call
// `pushManager.subscribe({ applicationServerKey })`.
//
// We intentionally return it from a server route rather than baking it into a
// NEXT_PUBLIC_ env var so a VAPID key rotation doesn't require a client-side
// rebuild — the new key is served on the next request.
//
// Returns 404 when no key is configured so the client knows push delivery is
// unavailable in this environment (and can hide the UI toggle).
export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY
  if (!key) {
    return NextResponse.json({ error: "vapid-not-configured" }, { status: 404 })
  }
  return NextResponse.json({ publicKey: key })
}
