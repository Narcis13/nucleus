"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ActionError, authedAction } from "@/lib/actions/safe-action"
import {
  createService as createServiceQuery,
  deleteService as deleteServiceQuery,
  getService,
  setServiceActive,
  updateService as updateServiceQuery,
} from "@/lib/db/queries/services"

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// Price is numeric(10,2) in Postgres — we accept a number in the UI and
// serialize as string on the way in.
// ─────────────────────────────────────────────────────────────────────────────
const baseFields = {
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).nullable().optional(),
  price: z
    .number()
    .min(0, "Price can't be negative")
    .max(999_999_999)
    .nullable()
    .optional(),
  currency: z.string().length(3).default("EUR"),
  durationMinutes: z
    .number()
    .int()
    .min(5, "Duration must be at least 5 minutes")
    .max(60 * 24, "Duration can't exceed 24 hours")
    .nullable()
    .optional(),
  isActive: z.boolean().default(true),
}

const createSchema = z.object(baseFields)

const updateSchema = z.object({
  id: z.string().uuid(),
  ...baseFields,
  isActive: z.boolean().optional(),
  currency: z.string().length(3).optional(),
})

const idSchema = z.object({ id: z.string().uuid() })

const toggleSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
})

function priceToNumericString(n: number | null | undefined): string | null {
  if (n === null || n === undefined) return null
  return n.toFixed(2)
}

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────

export const createServiceAction = authedAction
  .metadata({ actionName: "services.create" })
  .inputSchema(createSchema)
  .action(async ({ parsedInput }) => {
    const created = await createServiceQuery({
      name: parsedInput.name,
      description: parsedInput.description ?? null,
      price: priceToNumericString(parsedInput.price),
      currency: parsedInput.currency,
      durationMinutes: parsedInput.durationMinutes ?? null,
      isActive: parsedInput.isActive,
    })
    if (!created) throw new ActionError("Couldn't create service.")
    revalidatePath("/dashboard/services")
    return { id: created.id }
  })

export const updateServiceAction = authedAction
  .metadata({ actionName: "services.update" })
  .inputSchema(updateSchema)
  .action(async ({ parsedInput }) => {
    const existing = await getService(parsedInput.id)
    if (!existing) throw new ActionError("Service not found.")

    const updated = await updateServiceQuery(parsedInput.id, {
      name: parsedInput.name,
      description: parsedInput.description ?? null,
      price: priceToNumericString(parsedInput.price),
      currency: parsedInput.currency ?? existing.currency,
      durationMinutes: parsedInput.durationMinutes ?? null,
      ...(parsedInput.isActive === undefined
        ? {}
        : { isActive: parsedInput.isActive }),
    })
    if (!updated) throw new ActionError("Couldn't update service.")
    revalidatePath("/dashboard/services")
    return { id: updated.id }
  })

export const deleteServiceAction = authedAction
  .metadata({ actionName: "services.delete" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput }) => {
    const ok = await deleteServiceQuery(parsedInput.id)
    if (!ok) throw new ActionError("Service not found.")
    revalidatePath("/dashboard/services")
    return { id: parsedInput.id }
  })

export const toggleServiceAction = authedAction
  .metadata({ actionName: "services.toggleActive" })
  .inputSchema(toggleSchema)
  .action(async ({ parsedInput }) => {
    const updated = await setServiceActive(parsedInput.id, parsedInput.isActive)
    if (!updated) throw new ActionError("Service not found.")
    revalidatePath("/dashboard/services")
    return { id: updated.id, isActive: updated.isActive }
  })
