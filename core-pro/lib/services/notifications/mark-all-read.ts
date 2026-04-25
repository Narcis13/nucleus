import "server-only"

import { markAllAsRead } from "@/lib/db/queries/notifications"

import type { ServiceContext } from "../_lib/context"
import { UnauthorizedError } from "../_lib/errors"
import { resolveRecipient } from "./_recipient"

export type MarkAllNotificationsReadResult = { count: number }

export async function markAllNotificationsRead(
  ctx: ServiceContext,
): Promise<MarkAllNotificationsReadResult> {
  const recipient = await resolveRecipient(ctx.userId)
  if (!recipient) throw new UnauthorizedError()
  const rows = await markAllAsRead(recipient)
  return { count: rows.length }
}
