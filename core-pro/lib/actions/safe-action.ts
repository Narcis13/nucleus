import "server-only"

import { auth } from "@clerk/nextjs/server"
import {
  DEFAULT_SERVER_ERROR_MESSAGE,
  createSafeActionClient,
} from "next-safe-action"
import { headers } from "next/headers"
import { z } from "zod"

import { dbAdmin } from "@/lib/db/client"
import { ServiceError } from "@/lib/services/_lib/errors"
import { withRLS, type Tx } from "@/lib/db/rls"
import { requirePortalSession } from "@/lib/portal-auth/session"
import { apiRateLimit } from "@/lib/ratelimit"

// ─────────────────────────────────────────────────────────────────────────────
// Base client — shared error handling and metadata schema. Every action
// factory below extends this. Keep this file the single source of truth for
// action shape; route-specific behaviour goes into per-action `.use`.
// ─────────────────────────────────────────────────────────────────────────────
const baseClient = createSafeActionClient({
  defineMetadataSchema() {
    // `actionName` is required so log tags + ratelimit prefixes are useful.
    return z.object({
      actionName: z.string(),
    })
  },
  handleServerError(error, utils) {
    console.error(error, {
      tags: {
        actionName: utils.metadata?.actionName ?? "unknown",
      },
    })
    if (process.env.NODE_ENV !== "production") {
      console.error(
        `[action:${utils.metadata?.actionName ?? "unknown"}]`,
        error,
      )
    }
    if (error instanceof ActionError || error instanceof ServiceError) {
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
// logs errors via console.error.
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

// ─────────────────────────────────────────────────────────────────────────────
// portalAction — counterpart to `authedAction` for the client portal. Reads
// the `nucleus_portal` cookie, validates the session, and injects
// `{ clientId, professionalId, sessionId, db }` into ctx.
//
// Unlike `authedAction`, this **does not** open a `withRLS` transaction.
// Portal queries scope explicitly on `client_id` / `professional_id` from the
// session — RLS via Clerk JWT doesn't apply because the caller has no Clerk
// session at all. The trust boundary is the cookie HMAC + the DB-backed
// session row (`requirePortalSession`).
//
// Missing / tampered / expired cookie → `requirePortalSession` calls
// `redirect('/portal/sign-in')`, which surfaces as a NEXT_REDIRECT to the
// caller (the client component follows it on the next tick).
// ─────────────────────────────────────────────────────────────────────────────
export type PortalActionCtx = {
  clientId: string
  professionalId: string
  sessionId: string
  db: typeof dbAdmin
}

export const portalAction = baseClient.use(async ({ next, metadata }) => {
  const session = await requirePortalSession()
  if (apiRateLimit) {
    const key = `action:${metadata.actionName}:portal:${session.clientId}`
    const { success } = await apiRateLimit.limit(key)
    if (!success) {
      throw new ActionError("Rate limit exceeded — try again in a moment.")
    }
  }
  return next({
    ctx: {
      clientId: session.clientId,
      professionalId: session.professionalId,
      sessionId: session.sessionId,
      db: dbAdmin,
    } satisfies PortalActionCtx,
  })
})
