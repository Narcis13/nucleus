import "server-only"

import { markAsRead } from "@/lib/db/queries/notifications"

import type { ServiceContext } from "../_lib/context"

export type MarkNotificationReadInput = { id: string }
export type MarkNotificationReadResult = { count: number }

export async function markNotificationRead(
  _ctx: ServiceContext,
  input: MarkNotificationReadInput,
): Promise<MarkNotificationReadResult> {
  const rows = await markAsRead(input.id)
  return { count: rows.length }
}
