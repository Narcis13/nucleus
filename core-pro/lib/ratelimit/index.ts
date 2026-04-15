import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

const redis =
  redisUrl && redisToken
    ? new Redis({ url: redisUrl, token: redisToken })
    : null

function make(limiter: ReturnType<typeof Ratelimit.slidingWindow>) {
  if (!redis) return null
  return new Ratelimit({ redis, limiter, analytics: true, prefix: "corepro" })
}

export const authRatelimit = make(Ratelimit.slidingWindow(10, "10 s"))
export const webhookRatelimit = make(Ratelimit.slidingWindow(100, "60 s"))
export const publicRatelimit = make(Ratelimit.slidingWindow(60, "60 s"))
