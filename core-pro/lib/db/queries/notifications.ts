import "server-only"

import { and, desc, eq, isNull } from "drizzle-orm"

import { withRLS } from "@/lib/db/rls"
import { notifications } from "@/lib/db/schema"
import type { Notification } from "@/types/domain"

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
