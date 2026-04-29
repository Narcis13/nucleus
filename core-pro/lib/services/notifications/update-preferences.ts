import "server-only"

import { updateMyNotificationPreferences } from "@/lib/db/queries/notification-settings"
import type { NotificationPreferences } from "@/types/domain"

import type { ServiceContext } from "../_lib/context"
import { UnauthorizedError } from "../_lib/errors"
import { resolveRecipient } from "./_recipient"

export type UpdateNotificationPreferencesInput = NotificationPreferences
export type UpdateNotificationPreferencesResult = {
  preferences: NotificationPreferences
}

export async function updateNotificationPreferences(
  ctx: ServiceContext,
  input: UpdateNotificationPreferencesInput,
): Promise<UpdateNotificationPreferencesResult> {
  const recipient = await resolveRecipient(ctx.userId)
  if (!recipient) throw new UnauthorizedError()
  const stored = await updateMyNotificationPreferences(recipient, input)
  return { preferences: stored }
}
