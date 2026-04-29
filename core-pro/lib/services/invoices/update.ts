import "server-only"

import {
  getInvoice,
  updateInvoice as updateInvoiceQuery,
} from "@/lib/db/queries/invoices"
import type { InvoiceLineItem } from "@/types/domain"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError, ServiceError } from "../_lib/errors"
import { asNumericString, computeTotals, round2 } from "./_totals"

export type UpdateInvoiceInput = {
  id: string
  clientId?: string
  appointmentId?: string | null
  lineItems?: { description: string; quantity: number; unit_price: number; amount: number }[]
  taxRate?: number
  discount?: number
  currency?: string
  issueDate?: string
  dueDate?: string
  terms?: string
  notes?: string | null
  status?: "draft" | "sent"
}

export type UpdateInvoiceResult = { id: string }

export async function updateInvoice(
  _ctx: ServiceContext,
  input: UpdateInvoiceInput,
): Promise<UpdateInvoiceResult> {
  const existing = await getInvoice(input.id)
  if (!existing) throw new NotFoundError("Invoice not found.")
  if (existing.status === "paid") {
    throw new ServiceError("Paid invoices can't be edited.")
  }

  // When any billing-affecting field changes, recompute. Fall back to the
  // stored value for anything the caller didn't send.
  const lineItems = (input.lineItems ??
    (existing.lineItems as InvoiceLineItem[])) as InvoiceLineItem[]
  const normalized = lineItems.map((li) => ({
    ...li,
    amount: round2(Number(li.quantity) * Number(li.unit_price)),
  }))
  const taxRate = input.taxRate ?? Number(existing.taxRate)
  const discount = input.discount ?? Number(existing.discount)
  const totals = computeTotals(normalized, taxRate, discount)

  const patch = {
    clientId: input.clientId ?? existing.clientId,
    appointmentId: input.appointmentId ?? existing.appointmentId,
    lineItems: normalized,
    subtotal: asNumericString(totals.subtotal),
    taxRate: asNumericString(taxRate),
    taxAmount: asNumericString(totals.taxAmount),
    discount: asNumericString(discount),
    total: asNumericString(totals.total),
    currency: input.currency ?? existing.currency,
    issueDate: input.issueDate ?? existing.issueDate,
    dueDate: input.dueDate ?? existing.dueDate,
    terms: input.terms ?? existing.terms,
    notes: input.notes ?? existing.notes,
    status: input.status ?? existing.status,
  }

  const updated = await updateInvoiceQuery(input.id, patch)
  if (!updated) throw new NotFoundError("Invoice not found.")

  return { id: updated.id }
}
