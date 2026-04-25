import "server-only"

import { markInvoiceViewed as markInvoiceViewedQuery } from "@/lib/db/queries/invoices"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError } from "../_lib/errors"

export type MarkInvoiceViewedInput = { id: string }
export type MarkInvoiceViewedResult = { id: string }

export async function markInvoiceViewed(
  _ctx: ServiceContext,
  input: MarkInvoiceViewedInput,
): Promise<MarkInvoiceViewedResult> {
  const updated = await markInvoiceViewedQuery(input.id)
  if (!updated) throw new NotFoundError("Invoice not found.")
  return { id: updated.id }
}
