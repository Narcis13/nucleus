import "server-only"

import { removeTagFromClient as removeTagFromClientQuery } from "@/lib/db/queries/clients"

import type { ServiceContext } from "../_lib/context"

export type RemoveTagFromClientInput = { clientId: string; tagId: string }
export type RemoveTagFromClientResult = { ok: true }

export async function removeTagFromClient(
  _ctx: ServiceContext,
  input: RemoveTagFromClientInput,
): Promise<RemoveTagFromClientResult> {
  await removeTagFromClientQuery(input.clientId, input.tagId)
  return { ok: true }
}
