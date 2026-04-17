"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  ActionError,
  authedAction,
} from "@/lib/actions/safe-action"
import {
  createInvoice as createInvoiceQuery,
  deleteInvoice as deleteInvoiceQuery,
  getInvoice,
  getInvoiceWithRefs,
  markInvoiceSent as markInvoiceSentQuery,
  markInvoiceViewed as markInvoiceViewedQuery,
  recordPayment as recordPaymentQuery,
  updateInvoice as updateInvoiceQuery,
  upsertInvoiceSettings as upsertInvoiceSettingsQuery,
} from "@/lib/db/queries/invoices"
import { getProfessional } from "@/lib/db/queries/professionals"
import {
  sendInvoiceEmail,
  sendReceiptEmail,
} from "@/lib/invoices/emails"
import { renderInvoicePdf } from "@/lib/invoices/pdf"
import { trackServerEvent } from "@/lib/posthog/events"
import type { InvoiceLineItem } from "@/types/domain"

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
// Totals helper — single source of truth for arithmetic so every action agrees
// with the UI preview. We deliberately don't trust the client-supplied totals;
// recompute from line_items + tax_rate + discount.
// ─────────────────────────────────────────────────────────────────────────────
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function computeTotals(
  lineItems: InvoiceLineItem[],
  taxRate: number,
  discount: number,
) {
  const subtotal = round2(
    lineItems.reduce((sum, li) => sum + Number(li.amount || 0), 0),
  )
  const taxable = Math.max(0, subtotal - discount)
  const taxAmount = round2((taxable * taxRate) / 100)
  const total = round2(taxable + taxAmount)
  return { subtotal, taxAmount, total }
}

function asNumericString(n: number): string {
  return n.toFixed(2)
}

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────

export const createInvoiceAction = authedAction
  .metadata({ actionName: "invoices.create" })
  .inputSchema(createInvoiceSchema)
  .action(async ({ parsedInput }) => {
    const professional = await getProfessional()
    if (!professional) throw new ActionError("Unauthorized")

    if (parsedInput.dueDate < parsedInput.issueDate) {
      throw new ActionError("Due date cannot be before the issue date.")
    }

    const lineItems = parsedInput.lineItems.map((li) => ({
      ...li,
      amount: round2(Number(li.quantity) * Number(li.unit_price)),
    }))
    const totals = computeTotals(
      lineItems,
      parsedInput.taxRate,
      parsedInput.discount,
    )

    const invoice = await createInvoiceQuery({
      clientId: parsedInput.clientId,
      appointmentId: parsedInput.appointmentId ?? null,
      lineItems,
      subtotal: asNumericString(totals.subtotal),
      taxRate: asNumericString(parsedInput.taxRate),
      taxAmount: asNumericString(totals.taxAmount),
      discount: asNumericString(parsedInput.discount),
      total: asNumericString(totals.total),
      currency: parsedInput.currency,
      issueDate: parsedInput.issueDate,
      dueDate: parsedInput.dueDate,
      terms: parsedInput.terms ?? "Net 30",
      notes: parsedInput.notes ?? null,
      status: parsedInput.status,
    })

    // If the professional chose "Create + send" we fire the email
    // opportunistically. The send stamps `sent_at` and tolerates missing
    // Resend configuration — worst case we end up with an invoice stuck in
    // draft, which is obvious in the UI.
    if (parsedInput.status === "sent") {
      void sendInvoiceEmail({ invoiceId: invoice.id }).catch(() => {})
    }

    void trackServerEvent("invoice_created", {
      distinctId: professional.clerkUserId,
      professionalId: professional.id,
      plan: professional.plan,
      invoiceId: invoice.id,
      total: totals.total,
      currency: parsedInput.currency,
      status: parsedInput.status,
    })

    revalidatePath("/dashboard/invoices")
    return { id: invoice.id, invoiceNumber: invoice.invoiceNumber }
  })

export const updateInvoiceAction = authedAction
  .metadata({ actionName: "invoices.update" })
  .inputSchema(updateInvoiceSchema)
  .action(async ({ parsedInput }) => {
    const existing = await getInvoice(parsedInput.id)
    if (!existing) throw new ActionError("Invoice not found.")
    if (existing.status === "paid") {
      throw new ActionError("Paid invoices can't be edited.")
    }

    // When any billing-affecting field changes, recompute. Fall back to the
    // stored value for anything the caller didn't send.
    const lineItems = (parsedInput.lineItems ??
      (existing.lineItems as InvoiceLineItem[])) as InvoiceLineItem[]
    const normalized = lineItems.map((li) => ({
      ...li,
      amount: round2(Number(li.quantity) * Number(li.unit_price)),
    }))
    const taxRate = parsedInput.taxRate ?? Number(existing.taxRate)
    const discount = parsedInput.discount ?? Number(existing.discount)
    const totals = computeTotals(normalized, taxRate, discount)

    const patch = {
      clientId: parsedInput.clientId ?? existing.clientId,
      appointmentId: parsedInput.appointmentId ?? existing.appointmentId,
      lineItems: normalized,
      subtotal: asNumericString(totals.subtotal),
      taxRate: asNumericString(taxRate),
      taxAmount: asNumericString(totals.taxAmount),
      discount: asNumericString(discount),
      total: asNumericString(totals.total),
      currency: parsedInput.currency ?? existing.currency,
      issueDate: parsedInput.issueDate ?? existing.issueDate,
      dueDate: parsedInput.dueDate ?? existing.dueDate,
      terms: parsedInput.terms ?? existing.terms,
      notes: parsedInput.notes ?? existing.notes,
      status: parsedInput.status ?? existing.status,
    }

    const updated = await updateInvoiceQuery(parsedInput.id, patch)
    if (!updated) throw new ActionError("Invoice not found.")

    revalidatePath("/dashboard/invoices")
    revalidatePath(`/dashboard/invoices/${parsedInput.id}`)
    return { id: updated.id }
  })

export const sendInvoiceAction = authedAction
  .metadata({ actionName: "invoices.send" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput }) => {
    const updated = await markInvoiceSentQuery(parsedInput.id)
    if (!updated) throw new ActionError("Invoice not found.")
    // Email is best-effort — same rationale as createInvoiceAction.
    void sendInvoiceEmail({ invoiceId: updated.id }).catch(() => {})
    revalidatePath("/dashboard/invoices")
    return { id: updated.id }
  })

export const markInvoiceViewedAction = authedAction
  .metadata({ actionName: "invoices.markViewed" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput }) => {
    const updated = await markInvoiceViewedQuery(parsedInput.id)
    if (!updated) throw new ActionError("Invoice not found.")
    revalidatePath("/dashboard/invoices")
    return { id: updated.id }
  })

export const recordPaymentAction = authedAction
  .metadata({ actionName: "invoices.recordPayment" })
  .inputSchema(recordPaymentSchema)
  .action(async ({ parsedInput }) => {
    const before = await getInvoice(parsedInput.id)
    if (!before) throw new ActionError("Invoice not found.")

    const updated = await recordPaymentQuery({
      invoiceId: parsedInput.id,
      amount: parsedInput.amount,
      method: parsedInput.method,
      reference: parsedInput.reference ?? null,
      paidDate: parsedInput.paidDate ?? null,
    })
    if (!updated) throw new ActionError("Couldn't record payment.")

    // Fire the receipt email only on the transition into `paid` — partials
    // get a confirmation toast in-app but no email (prevents spam).
    if (updated.status === "paid" && before.status !== "paid") {
      void sendReceiptEmail({ invoiceId: updated.id }).catch(() => {})
    }

    revalidatePath("/dashboard/invoices")
    revalidatePath(`/dashboard/invoices/${updated.id}`)
    return {
      id: updated.id,
      status: updated.status,
      paidAmount: updated.paidAmount,
    }
  })

export const deleteInvoiceAction = authedAction
  .metadata({ actionName: "invoices.delete" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput }) => {
    const existing = await getInvoice(parsedInput.id)
    if (!existing) throw new ActionError("Invoice not found.")
    if (existing.status !== "draft" && Number(existing.paidAmount) > 0) {
      throw new ActionError(
        "Can't delete an invoice with recorded payments. Void it instead.",
      )
    }
    const deleted = await deleteInvoiceQuery(parsedInput.id)
    if (!deleted) throw new ActionError("Couldn't delete invoice.")
    revalidatePath("/dashboard/invoices")
    return { ok: true }
  })

// Returns the rendered invoice PDF as a base64 string. The UI should prefer
// the `/api/invoices/[id]/pdf` GET route for direct downloads; this action is
// useful when the caller needs the bytes inline (e.g. to attach to an outgoing
// email or to stash in storage). Scoped via withRLS through getInvoiceWithRefs.
export const generateInvoicePDFAction = authedAction
  .metadata({ actionName: "invoices.generatePdf" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput }) => {
    const data = await getInvoiceWithRefs(parsedInput.id)
    if (!data || !data.professional) {
      throw new ActionError("Invoice not found.")
    }
    const buffer = await renderInvoicePdf({
      invoice: data.invoice,
      client: data.client,
      professional: data.professional,
      settings: data.settings,
    })
    return {
      filename: `${data.invoice.invoiceNumber || data.invoice.id}.pdf`,
      mimeType: "application/pdf",
      base64: buffer.toString("base64"),
    }
  })

export const saveInvoiceSettingsAction = authedAction
  .metadata({ actionName: "invoices.saveSettings" })
  .inputSchema(settingsSchema)
  .action(async ({ parsedInput }) => {
    const patch: Record<string, unknown> = {}
    if (parsedInput.invoicePrefix !== undefined)
      patch.invoicePrefix = parsedInput.invoicePrefix
    if (parsedInput.defaultDueDays !== undefined)
      patch.defaultDueDays = parsedInput.defaultDueDays
    if (parsedInput.defaultTerms !== undefined)
      patch.defaultTerms = parsedInput.defaultTerms
    if (parsedInput.defaultNotes !== undefined)
      patch.defaultNotes = parsedInput.defaultNotes
    if (parsedInput.taxRate !== undefined)
      patch.taxRate = asNumericString(parsedInput.taxRate)
    if (parsedInput.logoUrl !== undefined) patch.logoUrl = parsedInput.logoUrl
    if (parsedInput.companyInfo !== undefined)
      patch.companyInfo = parsedInput.companyInfo

    await upsertInvoiceSettingsQuery(patch)
    revalidatePath("/dashboard/invoices")
    revalidatePath("/dashboard/settings")
    return { ok: true }
  })
