import "server-only"

import { createService as createServiceQuery } from "@/lib/db/queries/services"

import type { ServiceContext } from "../_lib/context"
import { ServiceError } from "../_lib/errors"

export type CreateCatalogServiceInput = {
  name: string
  description?: string | null
  price?: number | null
  currency: string
  durationMinutes?: number | null
  isActive: boolean
}

export type CreateCatalogServiceResult = { id: string }

function priceToNumericString(n: number | null | undefined): string | null {
  if (n === null || n === undefined) return null
  return n.toFixed(2)
}

export async function createService(
  _ctx: ServiceContext,
  input: CreateCatalogServiceInput,
): Promise<CreateCatalogServiceResult> {
  const created = await createServiceQuery({
    name: input.name,
    description: input.description ?? null,
    price: priceToNumericString(input.price),
    currency: input.currency,
    durationMinutes: input.durationMinutes ?? null,
    isActive: input.isActive,
  })
  if (!created) throw new ServiceError("Couldn't create service.")
  return { id: created.id }
}
