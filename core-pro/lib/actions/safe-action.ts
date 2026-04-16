import "server-only"

import { auth } from "@clerk/nextjs/server"
import {
  DEFAULT_SERVER_ERROR_MESSAGE,
  createSafeActionClient,
} from "next-safe-action"
import { headers } from "next/headers"
import { z } from "zod"

import { withRLS, type Tx } from "@/lib/db/rls"
import { apiRateLimit } from "@/lib/ratelimit"
import { captureException } from "@/lib/sentry"

// ─────────────────────────────────────────────────────────────────────────────
// Base client — shared error handling, metadata schema, and Sentry reporting.
// Every action factory below extends this. Keep this file the single source of
// truth for action shape; route-specific behaviour goes into per-action `.use`.
// ─────────────────────────────────────────────────────────────────────────────
const baseClient = createSafeActionClient({
  defineMetadataSchema() {
    // `actionName` is required so Sentry tags + ratelimit prefixes are useful.
    return z.object({
      actionName: z.string(),
    })
  },
  handleServerError(error, utils) {
    captureException(error, {
      tags: {
        actionName: utils.metadata?.actionName ?? "unknown",
      },
    })
    if (error instanceof ActionError) {
      return error.message
    }
    return DEFAULT_SERVER_ERROR_MESSAGE
  },
})

// Typed throwable so server code can return user-safe messages without leaking
// stack traces. Anything else returns DEFAULT_SERVER_ERROR_MESSAGE.
export class ActionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ActionError"
  }
}

// Best-effort identifier for ratelimit keys: signed-in userId beats IP, IP
// beats nothing. We don't fail the request if headers are unavailable.
async function ratelimitKey(prefix: string): Promise<string> {
  try {
    const { userId } = await auth()
    if (userId) return `${prefix}:user:${userId}`
  } catch {
    /* not in a request context — fall through */
  }
  try {
    const h = await headers()
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      "anonymous"
    return `${prefix}:ip:${ip}`
  } catch {
    return `${prefix}:anonymous`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// publicAction — no auth required. Validates input via Zod, applies the
// generic API ratelimit (skipped when Upstash is unconfigured locally), and
// reports errors to Sentry.
// ─────────────────────────────────────────────────────────────────────────────
export const publicAction = baseClient.use(async ({ next, metadata }) => {
  if (apiRateLimit) {
    const key = await ratelimitKey(`action:${metadata.actionName}`)
    const { success } = await apiRateLimit.limit(key)
    if (!success) {
      throw new ActionError("Rate limit exceeded — try again in a moment.")
    }
  }
  return next()
})

// ─────────────────────────────────────────────────────────────────────────────
// authedAction — requires a Clerk session. Injects `userId` / `orgId` into
// `ctx` and runs the action body inside a `withRLS` transaction so user-scoped
// queries hit the right rows automatically.
//
// Use `ctx.db` (a Drizzle `Tx`) inside the action body — every query made
// through it is RLS-enforced and committed atomically with the rest of the
// action.
// ─────────────────────────────────────────────────────────────────────────────
export type AuthedActionCtx = {
  userId: string
  orgId: string | null
  db: Tx
}

export const authedAction = baseClient.use(async ({ next, metadata }) => {
  const { userId, orgId } = await auth()
  if (!userId) {
    throw new ActionError("Unauthorized")
  }
  if (apiRateLimit) {
    const key = `action:${metadata.actionName}:user:${userId}`
    const { success } = await apiRateLimit.limit(key)
    if (!success) {
      throw new ActionError("Rate limit exceeded — try again in a moment.")
    }
  }
  return withRLS(async (tx) => {
    return next({
      ctx: {
        userId,
        orgId: orgId ?? null,
        db: tx,
      } satisfies AuthedActionCtx,
    })
  })
})
