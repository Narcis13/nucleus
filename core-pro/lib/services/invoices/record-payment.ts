import "server-only"

import {
  getInvoice,
  recordPayment as recordPaymentQuery,
} from "@/lib/db/queries/invoices"
import { sendReceiptEmail } from "@/lib/invoices/emails"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError, ServiceError } from "../_lib/errors"

export type RecordPaymentInput = {
  id: string
  amount: number
  method:
    | "cash"
    | "check"
    | "venmo"
    | "zelle"
    | "credit_card"
    | "bank_transfer"
    | "other"
  reference?: string
  paidDate?: string
}

export type RecordPaymentResult = {
  id: string
  status: string
  paidAmount: string
}

export async function recordPayment(
  _ctx: ServiceContext,
  input: RecordPaymentInput,
): Promise<RecordPaymentResult> {
  const before = await getInvoice(input.id)
  if (!before) throw new NotFoundError("Invoice not found.")

  const updated = await recordPaymentQuery({
    invoiceId: input.id,
    amount: input.amount,
    method: input.method,
    reference: input.reference ?? null,
    paidDate: input.paidDate ?? null,
  })
  if (!updated) throw new ServiceError("Couldn't record payment.")

  // Fire the receipt email only on the transition into `paid` — partials
  // get a confirmation toast in-app but no email (prevents spam).
  if (updated.status === "paid" && before.status !== "paid") {
    void sendReceiptEmail({ invoiceId: updated.id }).catch(() => {})
  }

  return {
    id: updated.id,
    status: updated.status,
    paidAmount: updated.paidAmount,
  }
}
