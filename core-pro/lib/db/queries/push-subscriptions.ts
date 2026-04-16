import "server-only"

import { and, eq } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { withRLS } from "@/lib/db/rls"
import { pushSubscriptions } from "@/lib/db/schema"
import type { PushSubscription } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// Push subscription CRUD.
//
// Writes go through RLS so a user can only create/delete their own rows. Reads
// for outbound delivery use `dbAdmin` because the sender runs outside the
// recipient's session (webhooks, Trigger.dev tasks, cross-user actions like
// "pro sends message → client gets push").
// ─────────────────────────────────────────────────────────────────────────────

export async function upsertPushSubscription(args: {
  userId: string
  userType: "professional" | "client"
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string | null
}): Promise<PushSubscription> {
  return withRLS(async (tx) => {
    const [row] = await tx
      .insert(pushSubscriptions)
      .values({
        userId: args.userId,
        userType: args.userType,
        endpoint: args.endpoint,
        p256dh: args.p256dh,
        auth: args.auth,
        userAgent: args.userAgent ?? null,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          userId: args.userId,
          userType: args.userType,
          p256dh: args.p256dh,
          auth: args.auth,
          userAgent: args.userAgent ?? null,
        },
      })
      .returning()
    if (!row) throw new Error("Failed to upsert push subscription")
    return row
  })
}

export async function deletePushSubscriptionByEndpoint(args: {
  endpoint: string
}): Promise<void> {
  await withRLS(async (tx) => {
    await tx
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, args.endpoint))
  })
}

// Service-role read — used by the universal sender to find every active
// subscription for a recipient. Not RLS-scoped because the sender may be a
// professional pushing to a client (or vice versa) from a context where the
// recipient isn't the session user.
export async function listPushSubscriptionsForUser(args: {
  userId: string
  userType: "professional" | "client"
}): Promise<PushSubscription[]> {
  return dbAdmin
    .select()
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, args.userId),
        eq(pushSubscriptions.userType, args.userType),
      ),
    )
}

// Service-role delete — the sender calls this when a push endpoint returns
// 404/410 (subscription expired). Keeps the table clean so we don't keep
// trying forever.
export async function deletePushSubscriptionByEndpointAdmin(
  endpoint: string,
): Promise<void> {
  await dbAdmin
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))
}
