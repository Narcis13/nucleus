import "server-only"

import { and, desc, eq, isNull, sql } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { withRLS } from "@/lib/db/rls"
import { notifications } from "@/lib/db/schema"
import type { NewNotification, Notification } from "@/types/domain"

// `userType` + `userId` together identify the recipient. RLS already restricts
// to the current Clerk user; we filter explicitly so the planner uses the
// `notifications_user_idx` index.
export async function getUnreadNotifications(args: {
  userId: string
  userType: "professional" | "client"
}): Promise<Notification[]> {
  return withRLS(async (tx) => {
    return tx
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, args.userId),
          eq(notifications.userType, args.userType),
          isNull(notifications.readAt),
        ),
      )
      .orderBy(desc(notifications.createdAt))
  })
}

export async function getNotifications(args: {
  userId: string
  userType: "professional" | "client"
  limit?: number
}): Promise<Notification[]> {
  return withRLS(async (tx) => {
    return tx
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, args.userId),
          eq(notifications.userType, args.userType),
        ),
      )
      .orderBy(desc(notifications.createdAt))
      .limit(args.limit ?? 50)
  })
}

export async function markAsRead(notificationId: string) {
  return withRLS(async (tx) => {
    return tx
      .update(notifications)
      .set({ readAt: new Date() })
      .where(eq(notifications.id, notificationId))
      .returning()
  })
}

export async function markAllAsRead(args: {
  userId: string
  userType: "professional" | "client"
}) {
  return withRLS(async (tx) => {
    return tx
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, args.userId),
          eq(notifications.userType, args.userType),
          isNull(notifications.readAt),
        ),
      )
      .returning({ id: notifications.id })
  })
}

// Count unread for the current user. Goes through RLS, so the caller does not
// need to pass their id — the policy handles it. Used by `useUnreadCount` via
// Supabase's PostgREST, but we also expose it here for server components that
// need the count during SSR.
export async function countUnread(args: {
  userId: string
  userType: "professional" | "client"
}): Promise<number> {
  return withRLS(async (tx) => {
    const rows = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, args.userId),
          eq(notifications.userType, args.userType),
          isNull(notifications.readAt),
        ),
      )
    return rows[0]?.count ?? 0
  })
}

// Service-role insert — called from `lib/notifications/send.ts` which already
// knows who the recipient is (and often runs in a webhook / background job
// without a user session). RLS on `notifications` is permissive for inserts
// to the owner; webhooks bypass it entirely via `dbAdmin`.
export async function createNotification(
  input: Omit<NewNotification, "id" | "createdAt" | "readAt">,
): Promise<Notification> {
  const [row] = await dbAdmin.insert(notifications).values(input).returning()
  if (!row) throw new Error("Failed to insert notification")
  return row
}
