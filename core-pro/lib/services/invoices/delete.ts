import "server-only"

import {
  deleteInvoice as deleteInvoiceQuery,
  getInvoice,
} from "@/lib/db/queries/invoices"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError, ServiceError } from "../_lib/errors"

export type DeleteInvoiceInput = { id: string }
export type DeleteInvoiceResult = { ok: true }

export async function deleteInvoice(
  _ctx: ServiceContext,
  input: DeleteInvoiceInput,
): Promise<DeleteInvoiceResult> {
  const existing = await getInvoice(input.id)
  if (!existing) throw new NotFoundError("Invoice not found.")
  if (existing.status !== "draft" && Number(existing.paidAmount) > 0) {
    throw new ServiceError(
      "Can't delete an invoice with recorded payments. Void it instead.",
    )
  }
  const deleted = await deleteInvoiceQuery(input.id)
  if (!deleted) throw new ServiceError("Couldn't delete invoice.")
  return { ok: true }
}
