import "server-only"

import {
  assignFormToClients as assignFormQuery,
  getExistingAssignmentsForClients,
} from "@/lib/db/queries/forms"

import type { ServiceContext } from "../_lib/context"
import { ServiceError } from "../_lib/errors"

export type AssignFormInput = {
  formId: string
  clientIds: string[]
  dueDate?: string
}

export type AssignFormResult = { assigned: number; skipped: number }

export async function assignForm(
  _ctx: ServiceContext,
  input: AssignFormInput,
): Promise<AssignFormResult> {
  // Skip clients who already have a pending assignment for this form so we
  // don't double-assign if the pro clicks twice. Completed assignments are
  // re-assignable — they show up as a new row.
  const existing = await getExistingAssignmentsForClients(
    input.formId,
    input.clientIds,
  )
  const toAssign = input.clientIds.filter((id) => !existing.has(id))
  if (toAssign.length === 0) {
    throw new ServiceError("These clients already have this form pending.")
  }
  const dueDate = input.dueDate
    ? new Date(`${input.dueDate}T23:59:59Z`)
    : null
  const created = await assignFormQuery(input.formId, toAssign, dueDate)
  return { assigned: created.length, skipped: existing.size }
}
