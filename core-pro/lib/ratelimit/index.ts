import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

const redis =
  redisUrl && redisToken
    ? new Redis({ url: redisUrl, token: redisToken })
    : null

function make(
  limiter: ReturnType<typeof Ratelimit.slidingWindow>,
  prefix: string,
) {
  if (!redis) return null
  return new Ratelimit({
    redis,
    limiter,
    analytics: true,
    prefix: `corepro:${prefix}`,
    ephemeralCache: new Map(),
  })
}

/** Sign-in / sign-up attempts — 5 per minute per IP. */
export const authRateLimit = make(Ratelimit.slidingWindow(5, "60 s"), "auth")

/** Webhook ingest (Stripe, Clerk) — 100 per second per provider. */
export const webhookRateLimit = make(
  Ratelimit.slidingWindow(100, "1 s"),
  "webhook",
)

/** Public forms (contact, booking widget) — 3 per minute per IP+slug. */
export const publicFormRateLimit = make(
  Ratelimit.slidingWindow(3, "60 s"),
  "form",
)

/** Default for /api/* routes — 60 per minute per user or IP. */
export const apiRateLimit = make(Ratelimit.slidingWindow(60, "60 s"), "api")

/** Health check endpoint — 10 per minute per IP. */
export const healthRateLimit = make(
  Ratelimit.slidingWindow(10, "60 s"),
  "health",
)
