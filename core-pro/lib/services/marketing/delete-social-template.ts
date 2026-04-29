import "server-only"

import { deleteSocialTemplate as deleteSocialTemplateQuery } from "@/lib/db/queries/marketing"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError } from "../_lib/errors"

export type DeleteSocialTemplateInput = { id: string }
export type DeleteSocialTemplateResult = { ok: true }

export async function deleteSocialTemplate(
  _ctx: ServiceContext,
  input: DeleteSocialTemplateInput,
): Promise<DeleteSocialTemplateResult> {
  const ok = await deleteSocialTemplateQuery(input.id)
  if (!ok) throw new NotFoundError("Template not found.")
  return { ok: true }
}
