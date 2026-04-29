import "server-only"

import { updateForm as updateFormQuery } from "@/lib/db/queries/forms"
import type { FormSchema } from "@/types/forms"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError } from "../_lib/errors"

export type UpdateFormInput = {
  id: string
  title?: string
  description?: string | null
  schema?: FormSchema
}

export type UpdateFormResult = { id: string }

export async function updateForm(
  _ctx: ServiceContext,
  input: UpdateFormInput,
): Promise<UpdateFormResult> {
  const { id, ...rest } = input
  const patch: Record<string, unknown> = {}
  if (rest.title !== undefined) patch.title = rest.title
  if (rest.description !== undefined) patch.description = rest.description
  if (rest.schema !== undefined) patch.schema = rest.schema
  const updated = await updateFormQuery(id, patch)
  if (!updated) throw new NotFoundError("Form not found.")
  return { id: updated.id }
}
