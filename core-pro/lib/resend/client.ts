import "server-only"

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { Resend } from "resend"

import { env } from "@/lib/env"
import { captureException } from "@/lib/sentry"
import type { PlanId } from "@/lib/stripe/plans"

import {
  TEMPLATES,
  type EmailTemplateId,
  type EmailTemplateMap,
} from "./templates"

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

// ─────────────────────────────────────────────────────────────────────────────
// Per-plan email rate limiting.
//
// Resend itself enforces a global per-account rate limit; the goal here is to
// stop a single tenant from exhausting our shared Resend quota or spamming
// recipients. Limits chosen to be generous for legitimate workflows but firm
// enough that a runaway automation can't burn the whole monthly budget in a
// few minutes.
//
// When Upstash isn't configured (e.g. local dev), rate limiting is a no-op —
// the function returns `{ success: true, remaining: Infinity }`. We never want
// the absence of Redis to silently break sends in development.
// ─────────────────────────────────────────────────────────────────────────────

const PLAN_LIMITS: Record<PlanId, { perHour: number; perDay: number }> = {
  starter: { perHour: 50, perDay: 200 },
  growth: { perHour: 200, perDay: 1000 },
  pro: { perHour: 1000, perDay: 5000 },
  enterprise: { perHour: 5000, perDay: 50000 },
}

let limiterCache: Map<string, Ratelimit> | null = null

function getRedis(): Redis | null {
  const url = env.UPSTASH_REDIS_REST_URL
  const token = env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

function getLimiter(plan: PlanId, window: "hour" | "day"): Ratelimit | null {
  const redis = getRedis()
  if (!redis) return null
  if (!limiterCache) limiterCache = new Map()
  const key = `${plan}:${window}`
  const cached = limiterCache.get(key)
  if (cached) return cached
  const limits = PLAN_LIMITS[plan]
  const created = new Ratelimit({
    redis,
    limiter:
      window === "hour"
        ? Ratelimit.slidingWindow(limits.perHour, "1 h")
        : Ratelimit.slidingWindow(limits.perDay, "1 d"),
    analytics: true,
    prefix: `corepro:email:${window}`,
    ephemeralCache: new Map(),
  })
  limiterCache.set(key, created)
  return created
}

export type EmailRateLimitResult = {
  success: boolean
  scope: "hour" | "day" | null
  remaining: number
  limit: number
  reset: number
}

// Checks both the hourly + daily window for the given plan + tenant. Returns
// the *failing* window when over-limit so the caller can surface a helpful
// message ("hourly limit reached, try again at HH:MM") instead of a generic
// 429.
export async function checkEmailRateLimit(args: {
  plan: PlanId
  tenantId: string
}): Promise<EmailRateLimitResult> {
  const { plan, tenantId } = args
  const limits = PLAN_LIMITS[plan]
  const hourLimiter = getLimiter(plan, "hour")
  const dayLimiter = getLimiter(plan, "day")
  if (!hourLimiter || !dayLimiter) {
    // No Redis → don't gate.
    return {
      success: true,
      scope: null,
      remaining: Number.POSITIVE_INFINITY,
      limit: limits.perHour,
      reset: 0,
    }
  }

  const hourly = await hourLimiter.limit(tenantId)
  if (!hourly.success) {
    return {
      success: false,
      scope: "hour",
      remaining: hourly.remaining,
      limit: limits.perHour,
      reset: hourly.reset,
    }
  }
  const daily = await dayLimiter.limit(tenantId)
  if (!daily.success) {
    return {
      success: false,
      scope: "day",
      remaining: daily.remaining,
      limit: limits.perDay,
      reset: daily.reset,
    }
  }
  return {
    success: true,
    scope: null,
    remaining: Math.min(hourly.remaining, daily.remaining),
    limit: limits.perHour,
    reset: 0,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// sendEmail — the canonical entry point. Looks up the template in the registry,
// rate-limits per plan + tenant, and submits to Resend. Best-effort: a missing
// Resend key returns `{ sent: false, reason: "no_resend" }` so local dev keeps
// working without API credentials.
//
// Callers that already manage their own rate limit (e.g. cron-driven invoice
// reminders) can pass `skipRateLimit: true`. The default is "always check"
// because most senders are user-initiated actions where a runaway automation
// is the realistic failure mode.
// ─────────────────────────────────────────────────────────────────────────────

export type SendEmailRecipient = string | string[]

export type SendEmailArgs<K extends EmailTemplateId> = {
  to: SendEmailRecipient
  template: K
  data: EmailTemplateMap[K]
  // Per-tenant rate-limit key — typically the professional id.
  tenantId?: string | null
  plan?: PlanId | null
  subject?: string
  replyTo?: string | string[]
  attachments?: Array<{
    filename: string
    content: string
    contentType?: string
  }>
  skipRateLimit?: boolean
  headers?: Record<string, string>
}

export type SendEmailResult =
  | { sent: true; id: string | null }
  | { sent: false; reason: "no_resend" | "rate_limited" | "error"; rateLimit?: EmailRateLimitResult; error?: unknown }

export async function sendEmail<K extends EmailTemplateId>(
  args: SendEmailArgs<K>,
): Promise<SendEmailResult> {
  const resend = getResend()
  if (!resend) return { sent: false, reason: "no_resend" }

  if (!args.skipRateLimit && args.tenantId) {
    const rateLimit = await checkEmailRateLimit({
      plan: args.plan ?? "starter",
      tenantId: args.tenantId,
    })
    if (!rateLimit.success) {
      return { sent: false, reason: "rate_limited", rateLimit }
    }
  }

  const entry = TEMPLATES[args.template]
  const subject = args.subject ?? entry.subject(args.data)
  const element = entry.render(args.data)

  try {
    const response = await resend.emails.send({
      from: fromAddress(),
      to: Array.isArray(args.to) ? args.to : [args.to],
      subject,
      react: element,
      replyTo: args.replyTo,
      attachments: args.attachments,
      headers: args.headers,
    })
    if (response.error) {
      captureException(response.error, {
        tags: { email_template: args.template },
      })
      return { sent: false, reason: "error", error: response.error }
    }
    return { sent: true, id: response.data?.id ?? null }
  } catch (error) {
    captureException(error, { tags: { email_template: args.template } })
    return { sent: false, reason: "error", error }
  }
}
