import "server-only"

import { deletePushSubscriptionByEndpoint } from "@/lib/db/queries/push-subscriptions"

import type { ServiceContext } from "../_lib/context"

export type UnsubscribePushInput = { endpoint: string }
export type UnsubscribePushResult = { ok: true }

export async function unsubscribePush(
  _ctx: ServiceContext,
  input: UnsubscribePushInput,
): Promise<UnsubscribePushResult> {
  await deletePushSubscriptionByEndpoint({ endpoint: input.endpoint })
  return { ok: true }
}
