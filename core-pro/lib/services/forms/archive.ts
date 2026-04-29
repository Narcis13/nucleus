import "server-only"

import { archiveForm as archiveFormQuery } from "@/lib/db/queries/forms"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError } from "../_lib/errors"

export type ArchiveFormInput = { id: string }
export type ArchiveFormResult = { ok: true }

export async function archiveForm(
  _ctx: ServiceContext,
  input: ArchiveFormInput,
): Promise<ArchiveFormResult> {
  const archived = await archiveFormQuery(input.id)
  if (!archived) throw new NotFoundError("Form not found.")
  return { ok: true }
}
