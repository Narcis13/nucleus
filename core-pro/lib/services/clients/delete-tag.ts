import "server-only"

import { deleteTag as deleteTagQuery } from "@/lib/db/queries/clients"

import type { ServiceContext } from "../_lib/context"

export type DeleteTagInput = { id: string }
export type DeleteTagResult = { ok: true }

export async function deleteTag(
  _ctx: ServiceContext,
  input: DeleteTagInput,
): Promise<DeleteTagResult> {
  await deleteTagQuery(input.id)
  return { ok: true }
}
