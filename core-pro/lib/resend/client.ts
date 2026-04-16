import "server-only"

import { Resend } from "resend"

import { env } from "@/lib/env"

// Single shared Resend client. The SDK is stateless, but we cache the instance
// so route handlers / actions don't allocate one per request.
let cached: Resend | null = null

export function getResend(): Resend | null {
  if (!env.RESEND_API_KEY) return null
  if (cached) return cached
  cached = new Resend(env.RESEND_API_KEY)
  return cached
}

export function fromAddress(): string {
  return env.RESEND_FROM_EMAIL
}
