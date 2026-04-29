import "server-only"

import { addTagToClients as addTagToClientsQuery } from "@/lib/db/queries/clients"

import type { ServiceContext } from "../_lib/context"

export type BulkAddTagInput = { clientIds: string[]; tagId: string }
export type BulkAddTagResult = { added: number }

export async function bulkAddTag(
  _ctx: ServiceContext,
  input: BulkAddTagInput,
): Promise<BulkAddTagResult> {
  const added = await addTagToClientsQuery(input.clientIds, input.tagId)
  return { added }
}
