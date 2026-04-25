import "server-only"

import { createForm as createFormQuery } from "@/lib/db/queries/forms"
import type { FormSchema } from "@/types/forms"

import type { ServiceContext } from "../_lib/context"

export type CreateFormInput = {
  title: string
  description?: string
  schema: FormSchema
}

export type CreateFormResult = { id: string }

export async function createForm(
  _ctx: ServiceContext,
  input: CreateFormInput,
): Promise<CreateFormResult> {
  const form = await createFormQuery({
    title: input.title,
    description: input.description,
    schema: input.schema,
  })
  return { id: form.id }
}
