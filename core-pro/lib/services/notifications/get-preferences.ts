import "server-only"

import { getMyNotificationPreferences } from "@/lib/db/queries/notification-settings"
import type { NotificationPreferences } from "@/types/domain"

import type { ServiceContext } from "../_lib/context"
import { UnauthorizedError } from "../_lib/errors"
import { resolveRecipient } from "./_recipient"

export type GetNotificationPreferencesResult = {
  preferences: NotificationPreferences | null
}

export async function getNotificationPreferences(
  ctx: ServiceContext,
): Promise<GetNotificationPreferencesResult> {
  const recipient = await resolveRecipient(ctx.userId)
  if (!recipient) throw new UnauthorizedError()
  const prefs = await getMyNotificationPreferences(recipient)
  return { preferences: prefs }
}
