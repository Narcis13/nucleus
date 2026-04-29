import "server-only"

import type { InvoiceLineItem } from "@/types/domain"

// Single source of truth for invoice arithmetic so every consumer agrees with
// the UI preview. We deliberately don't trust client-supplied totals; recompute
// from line_items + tax_rate + discount.
export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function computeTotals(
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

export function asNumericString(n: number): string {
  return n.toFixed(2)
}
