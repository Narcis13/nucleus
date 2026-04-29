"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { authedAction } from "@/lib/actions/safe-action"
import { createInvoice } from "@/lib/services/invoices/create"
import { deleteInvoice } from "@/lib/services/invoices/delete"
import { generateInvoicePdf } from "@/lib/services/invoices/generate-pdf"
import { markInvoiceViewed } from "@/lib/services/invoices/mark-viewed"
import { recordPayment } from "@/lib/services/invoices/record-payment"
import { saveInvoiceSettings } from "@/lib/services/invoices/save-settings"
import { sendInvoice } from "@/lib/services/invoices/send"
import { updateInvoice } from "@/lib/services/invoices/update"

// ─────────────────────────────────────────────────────────────────────────────
// Shared zod shapes
// ─────────────────────────────────────────────────────────────────────────────
const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required").max(500),
  quantity: z.number().min(0),
  unit_price: z.number().min(0),
  amount: z.number().min(0),
})

// Dates are exchanged as ISO strings (YYYY-MM-DD) so the shape travels over
// the wire cleanly. Totals are passed as numbers by the client; we serialize
// to strings at the query boundary because Drizzle's numeric type accepts
// strings to avoid float precision loss in Postgres.
const moneyInput = z.number().min(0).finite()
const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")

const baseInvoiceSchema = z.object({
  clientId: z.string().uuid(),
  appointmentId: z.string().uuid().nullable().optional(),
  lineItems: z.array(lineItemSchema).min(1, "Add at least one line item"),
  taxRate: moneyInput.default(0),
  discount: moneyInput.default(0),
  currency: z.string().min(1).max(10).default("EUR"),
  issueDate: isoDateSchema,
  dueDate: isoDateSchema,
  terms: z.string().max(100).optional(),
  notes: z.string().max(4000).nullable().optional(),
  status: z.enum(["draft", "sent"]).default("draft"),
})

const createInvoiceSchema = baseInvoiceSchema
const updateInvoiceSchema = baseInvoiceSchema.partial().extend({
  id: z.string().uuid(),
})

const idSchema = z.object({ id: z.string().uuid() })

const recordPaymentSchema = z.object({
  id: z.string().uuid(),
  amount: z.number().positive(),
  method: z.enum([
    "cash",
    "check",
    "venmo",
    "zelle",
    "credit_card",
    "bank_transfer",
    "other",
  ]),
  reference: z.string().max(200).optional(),
  paidDate: isoDateSchema.optional(),
})

const settingsSchema = z.object({
  invoicePrefix: z.string().min(1).max(10).optional(),
  defaultDueDays: z.number().int().min(0).max(365).optional(),
  defaultTerms: z.string().max(100).optional(),
  defaultNotes: z.string().max(2000).nullable().optional(),
  taxRate: moneyInput.optional(),
  logoUrl: z.string().url().nullable().optional(),
  companyInfo: z
    .object({
      name: z.string().max(200).optional(),
      address: z.string().max(500).optional(),
      city: z.string().max(200).optional(),
      postal_code: z.string().max(50).optional(),
      country: z.string().max(100).optional(),
      phone: z.string().max(40).optional(),
      email: z.string().email().optional().or(z.literal("")),
      website: z.string().url().optional().or(z.literal("")),
      tax_id: z.string().max(60).optional(),
    })
    .optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────

export const createInvoiceAction = authedAction
  .metadata({ actionName: "invoices.create" })
  .inputSchema(createInvoiceSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await createInvoice(ctx, parsedInput)
    revalidatePath("/dashboard/invoices")
    return result
  })

export const updateInvoiceAction = authedAction
  .metadata({ actionName: "invoices.update" })
  .inputSchema(updateInvoiceSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await updateInvoice(ctx, parsedInput)
    revalidatePath("/dashboard/invoices")
    revalidatePath(`/dashboard/invoices/${parsedInput.id}`)
    return result
  })

export const sendInvoiceAction = authedAction
  .metadata({ actionName: "invoices.send" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await sendInvoice(ctx, parsedInput)
    revalidatePath("/dashboard/invoices")
    return result
  })

export const markInvoiceViewedAction = authedAction
  .metadata({ actionName: "invoices.markViewed" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await markInvoiceViewed(ctx, parsedInput)
    revalidatePath("/dashboard/invoices")
    return result
  })

export const recordPaymentAction = authedAction
  .metadata({ actionName: "invoices.recordPayment" })
  .inputSchema(recordPaymentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await recordPayment(ctx, parsedInput)
    revalidatePath("/dashboard/invoices")
    revalidatePath(`/dashboard/invoices/${result.id}`)
    return result
  })

export const deleteInvoiceAction = authedAction
  .metadata({ actionName: "invoices.delete" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await deleteInvoice(ctx, parsedInput)
    revalidatePath("/dashboard/invoices")
    return result
  })

// Returns the rendered invoice PDF as a base64 string. The UI should prefer
// the `/api/invoices/[id]/pdf` GET route for direct downloads; this action is
// useful when the caller needs the bytes inline (e.g. to attach to an outgoing
// email or to stash in storage). Scoped via withRLS through getInvoiceWithRefs.
export const generateInvoicePDFAction = authedAction
  .metadata({ actionName: "invoices.generatePdf" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    return generateInvoicePdf(ctx, parsedInput)
  })

export const saveInvoiceSettingsAction = authedAction
  .metadata({ actionName: "invoices.saveSettings" })
  .inputSchema(settingsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await saveInvoiceSettings(ctx, parsedInput)
    revalidatePath("/dashboard/invoices")
    revalidatePath("/dashboard/settings")
    return result
  })
