import "server-only"

import { createTag as createTagQuery } from "@/lib/db/queries/clients"
import type { Tag } from "@/types/domain"

import type { ServiceContext } from "../_lib/context"

export type CreateTagInput = { name: string; color?: string }
export type CreateTagResult = { tag: Tag }

export async function createTag(
  _ctx: ServiceContext,
  input: CreateTagInput,
): Promise<CreateTagResult> {
  const tag = await createTagQuery(input)
  return { tag }
}
