import { NextResponse, type NextRequest } from "next/server"

import {
  getPortalInvoiceWithRefs,
  markPortalInvoiceViewed,
} from "@/lib/db/queries/portal"
import { renderInvoicePdf } from "@/lib/invoices/pdf"
import { requirePortalSession } from "@/lib/portal-auth/session"

// GET /api/portal/invoices/:id/pdf
//
// Portal counterpart to `/api/invoices/:id/pdf`. Authorization comes from the
// portal cookie (`requirePortalSession`); the invoice must belong to the
// authenticated client and be in a non-draft / non-void state. We also flip
// `sent → viewed` on the way through so the professional sees the receipt.
//
// `@react-pdf/renderer` needs a Node runtime (fontkit + pdfkit), not edge.

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

  const session = await requirePortalSession()
  const data = await getPortalInvoiceWithRefs(id, session.clientId)
  if (!data || !data.professional) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const buffer = await renderInvoicePdf({
    invoice: data.invoice,
    client: data.client,
    professional: data.professional,
    settings: data.settings,
  })

  // Fire-and-forget — the receipt stamp is a side-effect we don't want to
  // block the download on. Errors are swallowed (worst case the status stays
  // at 'sent' and we re-stamp on the next view).
  void markPortalInvoiceViewed(data.invoice.id, session.clientId).catch(() => {})

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
