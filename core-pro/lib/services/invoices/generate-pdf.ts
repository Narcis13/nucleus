import "server-only"

import { getInvoiceWithRefs } from "@/lib/db/queries/invoices"
import { renderInvoicePdf } from "@/lib/invoices/pdf"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError } from "../_lib/errors"

export type GenerateInvoicePdfInput = { id: string }
export type GenerateInvoicePdfResult = {
  filename: string
  mimeType: string
  base64: string
}

export async function generateInvoicePdf(
  _ctx: ServiceContext,
  input: GenerateInvoicePdfInput,
): Promise<GenerateInvoicePdfResult> {
  const data = await getInvoiceWithRefs(input.id)
  if (!data || !data.professional) {
    throw new NotFoundError("Invoice not found.")
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
}
