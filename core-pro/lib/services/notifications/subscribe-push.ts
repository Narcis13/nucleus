import "server-only"

import { upsertPushSubscription } from "@/lib/db/queries/push-subscriptions"

import type { ServiceContext } from "../_lib/context"
import { UnauthorizedError } from "../_lib/errors"
import { resolveRecipient } from "./_recipient"

export type SubscribePushInput = {
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string
}

export type SubscribePushResult = { id: string }

export async function subscribePush(
  ctx: ServiceContext,
  input: SubscribePushInput,
): Promise<SubscribePushResult> {
  const recipient = await resolveRecipient(ctx.userId)
  if (!recipient) throw new UnauthorizedError()
  const row = await upsertPushSubscription({
    ...recipient,
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
    userAgent: input.userAgent ?? null,
  })
  return { id: row.id }
}
