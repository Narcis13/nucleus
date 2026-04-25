import "server-only"

import {
  updateClient as updateClientQuery,
  updateRelationship,
} from "@/lib/db/queries/clients"

import type { ServiceContext } from "../_lib/context"

export type UpdateClientInput = {
  id: string
  fullName?: string
  email?: string
  phone?: string | null
  dateOfBirth?: string | null
  avatarUrl?: string | null
  locale?: string
  status?: string
  source?: string | null
  notes?: string | null
}

export type UpdateClientResult = { id: string; updated: boolean }

export async function updateClient(
  _ctx: ServiceContext,
  input: UpdateClientInput,
): Promise<UpdateClientResult> {
  const { id, status, source, notes, ...rest } = input

  const clientPatch: Record<string, unknown> = {}
  if (rest.fullName !== undefined) clientPatch.fullName = rest.fullName
  if (rest.email !== undefined) clientPatch.email = rest.email
  if (rest.phone !== undefined) clientPatch.phone = rest.phone || null
  if (rest.dateOfBirth !== undefined)
    clientPatch.dateOfBirth = rest.dateOfBirth || null
  if (rest.avatarUrl !== undefined) clientPatch.avatarUrl = rest.avatarUrl
  if (rest.locale !== undefined) clientPatch.locale = rest.locale

  let updatedClient = null
  if (Object.keys(clientPatch).length > 0) {
    updatedClient = await updateClientQuery(id, clientPatch)
  }

  const relationshipPatch: Record<string, unknown> = {}
  if (status !== undefined) relationshipPatch.status = status
  if (source !== undefined) relationshipPatch.source = source
  if (notes !== undefined) relationshipPatch.notes = notes
  if (Object.keys(relationshipPatch).length > 0) {
    await updateRelationship(id, relationshipPatch)
  }

  return {
    id,
    updated:
      Boolean(updatedClient) || Object.keys(relationshipPatch).length > 0,
  }
}
