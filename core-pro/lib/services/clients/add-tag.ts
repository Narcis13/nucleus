import "server-only"

import { addTagToClient as addTagToClientQuery } from "@/lib/db/queries/clients"

import type { ServiceContext } from "../_lib/context"

export type AddTagToClientInput = { clientId: string; tagId: string }
export type AddTagToClientResult = { ok: true }

export async function addTagToClient(
  _ctx: ServiceContext,
  input: AddTagToClientInput,
): Promise<AddTagToClientResult> {
  await addTagToClientQuery(input.clientId, input.tagId)
  return { ok: true }
}
