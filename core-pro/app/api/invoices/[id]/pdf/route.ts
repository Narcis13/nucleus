import { NextResponse, type NextRequest } from "next/server"

import { getInvoiceWithRefs } from "@/lib/db/queries/invoices"
import { renderInvoicePdf } from "@/lib/invoices/pdf"

// GET /api/invoices/:id/pdf
//
// Streams a branded invoice PDF. Authorization is enforced transitively: the
// read goes through `withRLS` (via `getInvoiceWithRefs`), so a caller without
// access to the invoice gets a null row and we respond with 404 rather than
// 403 to avoid leaking existence. `@react-pdf/renderer` needs a Node runtime
// (not edge) because it pulls in fontkit + pdfkit.

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidPattern.test(id)) {
    return NextResponse.json({ error: "Invalid invoice id" }, { status: 400 })
  }

  const data = await getInvoiceWithRefs(id)
  if (!data || !data.professional) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const buffer = await renderInvoicePdf({
    invoice: data.invoice,
    client: data.client,
    professional: data.professional,
    settings: data.settings,
  })

  const filename = `${data.invoice.invoiceNumber || data.invoice.id}.pdf`

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  })
}
