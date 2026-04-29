import "server-only"

import { setServiceActive as setServiceActiveQuery } from "@/lib/db/queries/services"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError } from "../_lib/errors"

export type SetCatalogServiceActiveInput = { id: string; isActive: boolean }
export type SetCatalogServiceActiveResult = { id: string; isActive: boolean }

export async function setServiceActive(
  _ctx: ServiceContext,
  input: SetCatalogServiceActiveInput,
): Promise<SetCatalogServiceActiveResult> {
  const updated = await setServiceActiveQuery(input.id, input.isActive)
  if (!updated) throw new NotFoundError("Service not found.")
  return { id: updated.id, isActive: updated.isActive }
}
