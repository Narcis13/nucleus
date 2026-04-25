import "server-only"

import { createInvoice as createInvoiceQuery } from "@/lib/db/queries/invoices"
import { getProfessional } from "@/lib/db/queries/professionals"
import { sendInvoiceEmail } from "@/lib/invoices/emails"
import { trackServerEvent } from "@/lib/posthog/events"

import type { ServiceContext } from "../_lib/context"
import { ServiceError, UnauthorizedError } from "../_lib/errors"
import { asNumericString, computeTotals, round2 } from "./_totals"

export type CreateInvoiceInput = {
  clientId: string
  appointmentId?: string | null
  lineItems: { description: string; quantity: number; unit_price: number; amount: number }[]
  taxRate: number
  discount: number
  currency: string
  issueDate: string
  dueDate: string
  terms?: string
  notes?: string | null
  status: "draft" | "sent"
}

export type CreateInvoiceResult = {
  id: string
  invoiceNumber: string
}

export async function createInvoice(
  _ctx: ServiceContext,
  input: CreateInvoiceInput,
): Promise<CreateInvoiceResult> {
  const professional = await getProfessional()
  if (!professional) throw new UnauthorizedError()

  if (input.dueDate < input.issueDate) {
    throw new ServiceError("Due date cannot be before the issue date.")
  }

  const lineItems = input.lineItems.map((li) => ({
    ...li,
    amount: round2(Number(li.quantity) * Number(li.unit_price)),
  }))
  const totals = computeTotals(lineItems, input.taxRate, input.discount)

  const invoice = await createInvoiceQuery({
    clientId: input.clientId,
    appointmentId: input.appointmentId ?? null,
    lineItems,
    subtotal: asNumericString(totals.subtotal),
    taxRate: asNumericString(input.taxRate),
    taxAmount: asNumericString(totals.taxAmount),
    discount: asNumericString(input.discount),
    total: asNumericString(totals.total),
    currency: input.currency,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    terms: input.terms ?? "Net 30",
    notes: input.notes ?? null,
    status: input.status,
  })

  // If the professional chose "Create + send" we fire the email
  // opportunistically. The send stamps `sent_at` and tolerates missing
  // Resend configuration — worst case we end up with an invoice stuck in
  // draft, which is obvious in the UI.
  if (input.status === "sent") {
    void sendInvoiceEmail({ invoiceId: invoice.id }).catch(() => {})
  }

  void trackServerEvent("invoice_created", {
    distinctId: professional.clerkUserId,
    professionalId: professional.id,
    plan: professional.plan,
    invoiceId: invoice.id,
    total: totals.total,
    currency: input.currency,
    status: input.status,
  })

  return { id: invoice.id, invoiceNumber: invoice.invoiceNumber }
}
