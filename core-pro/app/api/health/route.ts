import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { healthRateLimit } from "@/lib/ratelimit"

export const runtime = "nodejs"

async function checkDb(): Promise<{ ok: boolean; latencyMs: number }> {
  const url = process.env.DATABASE_URL
  if (!url) return { ok: false, latencyMs: 0 }

  try {
    const start = performance.now()
    const postgres = (await import("postgres")).default
    const sql = postgres(url, { max: 1, idle_timeout: 5 })
    await sql`SELECT 1`
    await sql.end()
    return { ok: true, latencyMs: Math.round(performance.now() - start) }
  } catch {
    return { ok: false, latencyMs: 0 }
  }
}

async function checkRedis(): Promise<{ ok: boolean; latencyMs: number }> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return { ok: false, latencyMs: 0 }

  try {
    const start = performance.now()
    const { Redis } = await import("@upstash/redis")
    const redis = new Redis({ url, token })
    await redis.ping()
    return { ok: true, latencyMs: Math.round(performance.now() - start) }
  } catch {
    return { ok: false, latencyMs: 0 }
  }
}

export async function GET(req: NextRequest) {
  // Rate limit: 10/min per IP
  if (healthRateLimit) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "anonymous"
    const { success, reset } = await healthRateLimit.limit(ip)
    if (!success) {
      const retryAfter = reset
        ? Math.max(1, Math.ceil((reset - Date.now()) / 1000))
        : 60
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      )
    }
  }

  const [db, redis] = await Promise.all([checkDb(), checkRedis()])

  const healthy = db.ok && redis.ok
  const status = healthy ? 200 : 503

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks: { db, redis },
    },
    { status },
  )
}
