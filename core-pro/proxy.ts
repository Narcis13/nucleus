// Next.js 16 renamed `middleware.ts` to `proxy.ts`. Same semantics, new file.
// Wires Clerk auth (clerkMiddleware) and Upstash ratelimit enforcement
// for auth / webhook / API routes.
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import {
  apiRateLimit,
  authRateLimit,
  webhookRateLimit,
} from "@/lib/ratelimit"

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/portal(.*)",
  "/api/protected(.*)",
])

const isAuthRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"])
const isWebhookRoute = createRouteMatcher(["/api/webhooks(.*)"])
const isApiRoute = createRouteMatcher(["/api(.*)"])

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anonymous"
  )
}

async function enforceRateLimit(req: NextRequest) {
  const ip = getIp(req)

  let limiter: typeof authRateLimit = null
  let retryAfterSec = 60

  if (isAuthRoute(req)) {
    limiter = authRateLimit
    retryAfterSec = 60
  } else if (isWebhookRoute(req)) {
    limiter = webhookRateLimit
    retryAfterSec = 1
  } else if (isApiRoute(req)) {
    limiter = apiRateLimit
    retryAfterSec = 60
  }

  if (!limiter) return null

  const { success, reset } = await limiter.limit(ip)
  if (success) return null

  // Compute Retry-After from the reset timestamp when available,
  // otherwise fall back to the window size.
  const retryAfter = reset
    ? Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    : retryAfterSec

  return NextResponse.json(
    { error: "Too many requests" },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  )
}

export default clerkMiddleware(async (auth, req) => {
  const limited = await enforceRateLimit(req)
  if (limited) return limited

  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  // Run on everything except static files, Next internals, and public
  // utility routes that must never touch Clerk (health check, Sentry tunnel).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|monitoring|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
    "/(api(?!/health)|trpc)(.*)",
  ],
}
