import "server-only"

import { markInvoiceSent as markInvoiceSentQuery } from "@/lib/db/queries/invoices"
import { sendInvoiceEmail } from "@/lib/invoices/emails"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError } from "../_lib/errors"

export type SendInvoiceInput = { id: string }
export type SendInvoiceResult = { id: string }

export async function sendInvoice(
  _ctx: ServiceContext,
  input: SendInvoiceInput,
): Promise<SendInvoiceResult> {
  const updated = await markInvoiceSentQuery(input.id)
  if (!updated) throw new NotFoundError("Invoice not found.")
  // Email is best-effort — same rationale as createInvoice.
  void sendInvoiceEmail({ invoiceId: updated.id }).catch(() => {})
  return { id: updated.id }
}
