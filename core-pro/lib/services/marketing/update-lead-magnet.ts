import "server-only"

import { updateLeadMagnet as updateLeadMagnetQuery } from "@/lib/db/queries/marketing"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError } from "../_lib/errors"

export type UpdateLeadMagnetInput = {
  id: string
  title?: string
  description?: string | null
  isPublished?: boolean
}

export type UpdateLeadMagnetResult = { id: string }

export async function updateLeadMagnet(
  _ctx: ServiceContext,
  input: UpdateLeadMagnetInput,
): Promise<UpdateLeadMagnetResult> {
  const { id, ...rest } = input
  const patch: Record<string, unknown> = {}
  if (rest.title !== undefined) patch.title = rest.title
  if (rest.description !== undefined) patch.description = rest.description
  if (rest.isPublished !== undefined) patch.isPublished = rest.isPublished
  const updated = await updateLeadMagnetQuery(id, patch)
  if (!updated) throw new NotFoundError("Lead magnet not found.")
  return { id: updated.id }
}
