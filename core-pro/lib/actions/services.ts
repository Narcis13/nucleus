"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { authedAction } from "@/lib/actions/safe-action"
import { createService } from "@/lib/services/catalog/create"
import { deleteService } from "@/lib/services/catalog/delete"
import { setServiceActive } from "@/lib/services/catalog/toggle-active"
import { updateService } from "@/lib/services/catalog/update"

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// Price is numeric(10,2) in Postgres — we accept a number in the UI and the
// service serializes as string on the way in.
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

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────

export const createServiceAction = authedAction
  .metadata({ actionName: "services.create" })
  .inputSchema(createSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await createService(ctx, parsedInput)
    revalidatePath("/dashboard/services")
    return result
  })

export const updateServiceAction = authedAction
  .metadata({ actionName: "services.update" })
  .inputSchema(updateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await updateService(ctx, parsedInput)
    revalidatePath("/dashboard/services")
    return result
  })

export const deleteServiceAction = authedAction
  .metadata({ actionName: "services.delete" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await deleteService(ctx, parsedInput)
    revalidatePath("/dashboard/services")
    return result
  })

export const toggleServiceAction = authedAction
  .metadata({ actionName: "services.toggleActive" })
  .inputSchema(toggleSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await setServiceActive(ctx, parsedInput)
    revalidatePath("/dashboard/services")
    return result
  })
