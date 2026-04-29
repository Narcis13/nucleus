import "server-only"

import { updateLead as updateLeadQuery } from "@/lib/db/queries/leads"
import type { Lead } from "@/types/domain"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError } from "../_lib/errors"

export type UpdateLeadInput = {
  id: string
  fullName?: string
  email?: string | null
  phone?: string | null
  source?: string | null
  score?: number
  notes?: string | null
}

export type UpdateLeadResult = { lead: Lead }

export async function updateLead(
  _ctx: ServiceContext,
  input: UpdateLeadInput,
): Promise<UpdateLeadResult> {
  const { id, ...rest } = input
  const patch: Record<string, unknown> = {}
  if (rest.fullName !== undefined) patch.fullName = rest.fullName
  if (rest.email !== undefined) patch.email = rest.email || null
  if (rest.phone !== undefined) patch.phone = rest.phone || null
  if (rest.source !== undefined) patch.source = rest.source || null
  if (rest.score !== undefined) patch.score = rest.score
  if (rest.notes !== undefined) patch.notes = rest.notes
  const updated = await updateLeadQuery(id, patch)
  if (!updated) throw new NotFoundError("Lead not found.")
  return { lead: updated }
}
