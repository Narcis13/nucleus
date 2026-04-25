import "server-only"

import { sendNotification } from "@/lib/notifications/send"

import type { ServiceContext } from "../_lib/context"
import { UnauthorizedError } from "../_lib/errors"
import { resolveRecipient } from "./_recipient"

export type SendTestNotificationResult = {
  in_app: boolean
  email: boolean
  push: { attempted: number; delivered: number }
}

export async function sendTestNotification(
  ctx: ServiceContext,
): Promise<SendTestNotificationResult> {
  const recipient = await resolveRecipient(ctx.userId)
  if (!recipient) throw new UnauthorizedError()
  const result = await sendNotification({
    ...recipient,
    type: "system",
    title: "Test notification",
    body: "If you can read this, your notifications are wired up correctly.",
    link:
      recipient.userType === "professional"
        ? "/dashboard/notifications"
        : "/portal",
  })
  return {
    in_app: result.delivered.in_app,
    email: result.delivered.email,
    push: result.delivered.push,
  }
}
