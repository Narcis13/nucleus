import "server-only"

import { getCurrentProfessionalId } from "@/lib/clerk/helpers"
import { archiveClient as archiveClientQuery } from "@/lib/db/queries/clients"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError, UnauthorizedError } from "../_lib/errors"

export type ArchiveClientInput = { id: string }
export type ArchiveClientResult = { id: string }

export async function archiveClient(
  _ctx: ServiceContext,
  input: ArchiveClientInput,
): Promise<ArchiveClientResult> {
  const professionalId = await getCurrentProfessionalId()
  if (!professionalId) {
    throw new UnauthorizedError("Unauthorized")
  }
  const archived = await archiveClientQuery(input.id)
  if (!archived) {
    throw new NotFoundError("Client not found or already archived.")
  }
  return { id: input.id }
}
