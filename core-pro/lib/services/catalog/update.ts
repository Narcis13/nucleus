import "server-only"

import {
  getService,
  updateService as updateServiceQuery,
} from "@/lib/db/queries/services"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError, ServiceError } from "../_lib/errors"

export type UpdateCatalogServiceInput = {
  id: string
  name: string
  description?: string | null
  price?: number | null
  currency?: string
  durationMinutes?: number | null
  isActive?: boolean
}

export type UpdateCatalogServiceResult = { id: string }

function priceToNumericString(n: number | null | undefined): string | null {
  if (n === null || n === undefined) return null
  return n.toFixed(2)
}

export async function updateService(
  _ctx: ServiceContext,
  input: UpdateCatalogServiceInput,
): Promise<UpdateCatalogServiceResult> {
  const existing = await getService(input.id)
  if (!existing) throw new NotFoundError("Service not found.")

  const updated = await updateServiceQuery(input.id, {
    name: input.name,
    description: input.description ?? null,
    price: priceToNumericString(input.price),
    currency: input.currency ?? existing.currency,
    durationMinutes: input.durationMinutes ?? null,
    ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
  })
  if (!updated) throw new ServiceError("Couldn't update service.")
  return { id: updated.id }
}
