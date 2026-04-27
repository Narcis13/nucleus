import "server-only"

import { createSocialTemplate as createSocialTemplateQuery } from "@/lib/db/queries/marketing"
import { getProfessional } from "@/lib/db/queries/professionals"

import type { ServiceContext } from "../_lib/context"
import { UnauthorizedError } from "../_lib/errors"

export type CreateSocialTemplateInput = {
  name: string
  layout: string
  platform:
    | "instagram_square"
    | "instagram_story"
    | "linkedin_post"
    | "twitter_post"
  design: Record<string, unknown>
  caption?: string | null
  hashtags?: string[]
}

export type CreateSocialTemplateResult = { id: string }

export async function createSocialTemplate(
  _ctx: ServiceContext,
  input: CreateSocialTemplateInput,
): Promise<CreateSocialTemplateResult> {
  const professional = await getProfessional()
  if (!professional) throw new UnauthorizedError("Complete onboarding first.")
  const created = await createSocialTemplateQuery({
    professionalId: professional.id,
    name: input.name,
    layout: input.layout,
    platform: input.platform,
    design: input.design,
    caption: input.caption ?? null,
    hashtags: input.hashtags ?? [],
  })
  return { id: created.id }
}
