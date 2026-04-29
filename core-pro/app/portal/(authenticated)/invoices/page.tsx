import { Download, FileText } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { EmptyState, PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getPortalInvoices,
  getPortalProfessionalLocale,
} from "@/lib/db/queries/portal"
import { formatCurrency, formatDate } from "@/lib/i18n/format"
import { requirePortalSession } from "@/lib/portal-auth/session"
import type { Invoice } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// Portal → Invoices
//
// Read-only view of the invoices the professional has shared with the
// authenticated client. Drafts and voided invoices are filtered server-side.
// Each row links to `/api/portal/invoices/[id]/pdf` which streams a branded
// PDF and stamps the invoice as viewed on the way through.
// ─────────────────────────────────────────────────────────────────────────────

const VARIANT_BY_STATUS: Record<
  string,
  { variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  sent: { variant: "secondary" },
  viewed: { variant: "secondary" },
  partial: { variant: "default" },
  paid: { variant: "default" },
  overdue: { variant: "destructive" },
}

export default async function PortalInvoicesPage() {
  const session = await requirePortalSession()
  const t = await getTranslations("portal.invoices")
  const tStatus = await getTranslations("portal.invoices.status")

  const [invoices, professionalLocale] = await Promise.all([
    getPortalInvoices(session.clientId),
    getPortalProfessionalLocale(session.professionalId),
  ])
  const currency = professionalLocale?.currency ?? "EUR"
  const locale = professionalLocale?.locale ?? undefined

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("title")} description={t("description")} />
        <EmptyState
          icon={<FileText />}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      </div>
    )
  }

  const totals = computeTotals(invoices)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard
          label={t("outstanding")}
          value={formatCurrency(totals.outstanding, { currency, locale })}
          caption={t("outstandingCount", { count: totals.outstandingCount })}
        />
        <SummaryCard
          label={t("overdue")}
          value={formatCurrency(totals.overdue, { currency, locale })}
          caption={t("overdueCount", { count: totals.overdueCount })}
          tone={totals.overdue > 0 ? "danger" : "neutral"}
        />
        <SummaryCard
          label={t("paid")}
          value={formatCurrency(totals.paid, { currency, locale })}
          caption={t("paidCount", { count: totals.paidCount })}
        />
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columnInvoice")}</TableHead>
              <TableHead>{t("columnStatus")}</TableHead>
              <TableHead>{t("columnIssued")}</TableHead>
              <TableHead>{t("columnDue")}</TableHead>
              <TableHead className="text-right">{t("columnTotal")}</TableHead>
              <TableHead className="text-right">{t("columnPaid")}</TableHead>
              <TableHead className="w-[1%] text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => {
              const variant =
                VARIANT_BY_STATUS[inv.status]?.variant ?? "outline"
              return (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">
                    {inv.invoiceNumber}
                  </TableCell>
                  <TableCell>
                    <Badge variant={variant}>
                      {translateStatus(tStatus, inv.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(inv.issueDate, { locale })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(inv.dueDate, { locale })}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(inv.total), {
                      currency: inv.currency || currency,
                      locale,
                    })}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatCurrency(Number(inv.paidAmount), {
                      currency: inv.currency || currency,
                      locale,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      render={
                        <a
                          href={`/api/portal/invoices/${inv.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={t("downloadAriaLabel", {
                            invoice: inv.invoiceNumber,
                          })}
                        >
                          <Download className="size-4" />
                          <span className="hidden sm:inline">
                            {t("download")}
                          </span>
                        </a>
                      }
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// next-intl throws on unknown keys; the invoice status union is bounded by
// the schema, but new statuses (e.g. void) shouldn't crash an old portal.
function translateStatus(
  t: Awaited<ReturnType<typeof getTranslations>>,
  status: string,
): string {
  const KNOWN = new Set(["sent", "viewed", "partial", "paid", "overdue"])
  return KNOWN.has(status) ? t(status) : status
}

function SummaryCard({
  label,
  value,
  caption,
  tone = "neutral",
}: {
  label: string
  value: string
  caption: string
  tone?: "neutral" | "danger"
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={
          "mt-1 font-heading text-xl font-semibold " +
          (tone === "danger" ? "text-destructive" : "text-foreground")
        }
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
    </div>
  )
}

type Totals = {
  outstanding: number
  outstandingCount: number
  overdue: number
  overdueCount: number
  paid: number
  paidCount: number
}

function computeTotals(invoices: Invoice[]): Totals {
  const totals: Totals = {
    outstanding: 0,
    outstandingCount: 0,
    overdue: 0,
    overdueCount: 0,
    paid: 0,
    paidCount: 0,
  }
  for (const inv of invoices) {
    const total = Number(inv.total)
    const paid = Number(inv.paidAmount)
    const remaining = Math.max(0, total - paid)
    if (inv.status === "paid") {
      totals.paid += total
      totals.paidCount += 1
      continue
    }
    if (inv.status === "overdue") {
      totals.overdue += remaining
      totals.overdueCount += 1
    }
    totals.outstanding += remaining
    totals.outstandingCount += 1
  }
  return totals
}
