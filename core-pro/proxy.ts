// Next.js 16 renamed `middleware.ts` to `proxy.ts`. Same semantics, new file.
// This stub wires Clerk's auth (clerkMiddleware) and sketches the Upstash
// ratelimit hook points for auth / webhook / public routes.
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import {
  authRatelimit,
  publicRatelimit,
  webhookRatelimit,
} from "@/lib/ratelimit"

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/portal(.*)",
  "/api/protected(.*)",
])

const isAuthRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"])
const isWebhookRoute = createRouteMatcher(["/api/webhooks(.*)"])
const isApiRoute = createRouteMatcher(["/api(.*)"])

async function enforceRatelimit(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anonymous"

  let limiter: typeof authRatelimit = null
  if (isAuthRoute(req)) limiter = authRatelimit
  else if (isWebhookRoute(req)) limiter = webhookRatelimit
  else if (isApiRoute(req)) limiter = publicRatelimit

  if (!limiter) return null
  const { success } = await limiter.limit(ip)
  if (success) return null

  return NextResponse.json(
    { error: "Too many requests" },
    { status: 429, headers: { "Retry-After": "60" } },
  )
}

export default clerkMiddleware(async (auth, req) => {
  const limited = await enforceRatelimit(req)
  if (limited) return limited

  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  // Run on everything except static files and Next internals.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
    "/(api|trpc)(.*)",
  ],
}
