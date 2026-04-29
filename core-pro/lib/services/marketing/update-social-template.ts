import "server-only"

import { updateSocialTemplate as updateSocialTemplateQuery } from "@/lib/db/queries/marketing"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError } from "../_lib/errors"

export type UpdateSocialTemplateInput = {
  id: string
  name?: string
  layout?: string
  platform?:
    | "instagram_square"
    | "instagram_story"
    | "linkedin_post"
    | "twitter_post"
  design?: Record<string, unknown>
  caption?: string | null
  hashtags?: string[]
}

export type UpdateSocialTemplateResult = { id: string }

export async function updateSocialTemplate(
  _ctx: ServiceContext,
  input: UpdateSocialTemplateInput,
): Promise<UpdateSocialTemplateResult> {
  const { id, ...rest } = input
  const patch: Record<string, unknown> = {}
  if (rest.name !== undefined) patch.name = rest.name
  if (rest.layout !== undefined) patch.layout = rest.layout
  if (rest.platform !== undefined) patch.platform = rest.platform
  if (rest.design !== undefined) patch.design = rest.design
  if (rest.caption !== undefined) patch.caption = rest.caption
  if (rest.hashtags !== undefined) patch.hashtags = rest.hashtags
  const updated = await updateSocialTemplateQuery(id, patch)
  if (!updated) throw new NotFoundError("Template not found.")
  return { id: updated.id }
}
