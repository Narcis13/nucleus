import "server-only"

import { deleteService as deleteServiceQuery } from "@/lib/db/queries/services"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError } from "../_lib/errors"

export type DeleteCatalogServiceInput = { id: string }
export type DeleteCatalogServiceResult = { id: string }

export async function deleteService(
  _ctx: ServiceContext,
  input: DeleteCatalogServiceInput,
): Promise<DeleteCatalogServiceResult> {
  const ok = await deleteServiceQuery(input.id)
  if (!ok) throw new NotFoundError("Service not found.")
  return { id: input.id }
}
