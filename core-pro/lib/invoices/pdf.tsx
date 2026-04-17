import "server-only"

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer"
import { createElement } from "react"

import { formatCurrency, formatDate } from "@/lib/i18n/format"
import type {
  Client,
  Invoice,
  InvoiceCompanyInfo,
  InvoiceLineItem,
  InvoiceSettings,
  Professional,
} from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// Invoice PDF renderer
//
// Uses @react-pdf/renderer on the server to produce a branded invoice PDF from
// the {invoice, client, professional, settings} tuple returned by
// `getInvoiceWithRefs`. The caller owns auth/RLS; this module is a pure
// formatter — no DB, no fs, no fetches.
//
// JSX is intentionally avoided so this file can be imported from server
// actions, route handlers, and Trigger.dev tasks without pulling the React
// JSX runtime transform into contexts that don't expect it.
// ─────────────────────────────────────────────────────────────────────────────

type InvoicePdfInput = {
  invoice: Invoice
  client: Pick<Client, "fullName" | "email" | "phone"> | null
  professional: Pick<Professional, "fullName" | "email" | "currency" | "locale">
  settings: InvoiceSettings | null
}

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10,
    color: "#111827",
    fontFamily: "Helvetica",
    lineHeight: 1.5,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  brandBlock: {
    flexDirection: "column",
  },
  brandName: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 4,
    color: "#111827",
  },
  mutedText: {
    color: "#6b7280",
    fontSize: 9,
  },
  invoiceMetaBlock: {
    textAlign: "right",
    flexDirection: "column",
  },
  invoiceTitle: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 1,
    color: "#111827",
  },
  invoiceNumber: {
    marginTop: 2,
    fontSize: 10,
    color: "#374151",
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 24,
  },
  sectionTitle: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#6b7280",
    marginBottom: 4,
  },
  sectionBody: {
    fontSize: 10,
    color: "#111827",
  },
  table: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginTop: 8,
    marginBottom: 16,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 9,
    textTransform: "uppercase",
    color: "#6b7280",
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  colDescription: { flex: 4 },
  colQty: { flex: 1, textAlign: "right" },
  colUnit: { flex: 1.2, textAlign: "right" },
  colAmount: { flex: 1.4, textAlign: "right" },
  totalsBlock: {
    alignSelf: "flex-end",
    width: "45%",
    marginTop: 4,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalsGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#111827",
    fontSize: 12,
    fontWeight: 700,
  },
  footer: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
    fontSize: 9,
    color: "#6b7280",
  },
})

function extractLineItems(invoice: Invoice): InvoiceLineItem[] {
  const items = invoice.lineItems as unknown
  if (!Array.isArray(items)) return []
  return items as InvoiceLineItem[]
}

function money(value: string | number, currency: string, locale: string | null): string {
  return formatCurrency(Number(value), {
    currency,
    locale: locale ?? undefined,
  })
}

export function buildInvoiceDocument(input: InvoicePdfInput) {
  const { invoice, client, professional, settings } = input
  const currency = invoice.currency || professional.currency || "EUR"
  const locale = professional.locale
  const company = (settings?.companyInfo as InvoiceCompanyInfo | null) ?? null
  const lineItems = extractLineItems(invoice)
  const brandName = company?.name?.trim() || professional.fullName || "CorePro"

  const addressLines = [
    company?.address,
    [company?.postal_code, company?.city].filter(Boolean).join(" "),
    company?.country,
  ]
    .map((line) => (line ?? "").trim())
    .filter(Boolean)

  const contactLines = [
    company?.email || professional.email,
    company?.phone,
    company?.website,
    company?.tax_id ? `Tax ID: ${company.tax_id}` : null,
  ].filter(Boolean) as string[]

  return createElement(
    Document,
    { title: `Invoice ${invoice.invoiceNumber}` },
    createElement(
      Page,
      { size: "A4", style: styles.page },
      // Header
      createElement(
        View,
        { style: styles.headerRow },
        createElement(
          View,
          { style: styles.brandBlock },
          createElement(Text, { style: styles.brandName }, brandName),
          ...addressLines.map((line, i) =>
            createElement(Text, { key: `addr-${i}`, style: styles.mutedText }, line),
          ),
          ...contactLines.map((line, i) =>
            createElement(Text, { key: `contact-${i}`, style: styles.mutedText }, line),
          ),
        ),
        createElement(
          View,
          { style: styles.invoiceMetaBlock },
          createElement(Text, { style: styles.invoiceTitle }, "INVOICE"),
          createElement(Text, { style: styles.invoiceNumber }, `#${invoice.invoiceNumber}`),
          createElement(
            Text,
            { style: styles.mutedText },
            `Issued ${formatDate(invoice.issueDate, { locale: locale ?? undefined })}`,
          ),
          createElement(
            Text,
            { style: styles.mutedText },
            `Due ${formatDate(invoice.dueDate, { locale: locale ?? undefined })}`,
          ),
          createElement(
            Text,
            { style: styles.mutedText },
            `Status: ${invoice.status.toUpperCase()}`,
          ),
        ),
      ),
      // Bill-to + terms
      createElement(
        View,
        { style: styles.sectionRow },
        createElement(
          View,
          { style: { flex: 1 } },
          createElement(Text, { style: styles.sectionTitle }, "Bill to"),
          createElement(
            Text,
            { style: styles.sectionBody },
            client?.fullName ?? "Client",
          ),
          client?.email
            ? createElement(Text, { style: styles.mutedText }, client.email)
            : null,
          client?.phone
            ? createElement(Text, { style: styles.mutedText }, client.phone)
            : null,
        ),
        createElement(
          View,
          { style: { flex: 1 } },
          createElement(Text, { style: styles.sectionTitle }, "Terms"),
          createElement(
            Text,
            { style: styles.sectionBody },
            invoice.terms || "Net 30",
          ),
        ),
      ),
      // Line items table
      createElement(
        View,
        { style: styles.table },
        createElement(
          View,
          { style: styles.tableHead },
          createElement(Text, { style: styles.colDescription }, "Description"),
          createElement(Text, { style: styles.colQty }, "Qty"),
          createElement(Text, { style: styles.colUnit }, "Unit price"),
          createElement(Text, { style: styles.colAmount }, "Amount"),
        ),
        ...lineItems.map((item, i) =>
          createElement(
            View,
            { key: `row-${i}`, style: styles.tableRow },
            createElement(Text, { style: styles.colDescription }, item.description),
            createElement(Text, { style: styles.colQty }, String(item.quantity)),
            createElement(
              Text,
              { style: styles.colUnit },
              money(item.unit_price, currency, locale),
            ),
            createElement(
              Text,
              { style: styles.colAmount },
              money(item.amount, currency, locale),
            ),
          ),
        ),
      ),
      // Totals
      createElement(
        View,
        { style: styles.totalsBlock },
        createElement(
          View,
          { style: styles.totalsRow },
          createElement(Text, null, "Subtotal"),
          createElement(Text, null, money(invoice.subtotal, currency, locale)),
        ),
        Number(invoice.discount) > 0
          ? createElement(
              View,
              { style: styles.totalsRow },
              createElement(Text, null, "Discount"),
              createElement(
                Text,
                null,
                `− ${money(invoice.discount, currency, locale)}`,
              ),
            )
          : null,
        Number(invoice.taxAmount) > 0
          ? createElement(
              View,
              { style: styles.totalsRow },
              createElement(Text, null, `Tax (${Number(invoice.taxRate).toFixed(2)}%)`),
              createElement(
                Text,
                null,
                money(invoice.taxAmount, currency, locale),
              ),
            )
          : null,
        createElement(
          View,
          { style: styles.totalsGrand },
          createElement(Text, null, "Total"),
          createElement(Text, null, money(invoice.total, currency, locale)),
        ),
        Number(invoice.paidAmount) > 0
          ? createElement(
              View,
              { style: styles.totalsRow },
              createElement(Text, null, "Paid"),
              createElement(
                Text,
                null,
                `− ${money(invoice.paidAmount, currency, locale)}`,
              ),
            )
          : null,
        Number(invoice.paidAmount) > 0 &&
          Number(invoice.paidAmount) < Number(invoice.total)
          ? createElement(
              View,
              { style: styles.totalsRow },
              createElement(Text, null, "Balance due"),
              createElement(
                Text,
                null,
                money(
                  Number(invoice.total) - Number(invoice.paidAmount),
                  currency,
                  locale,
                ),
              ),
            )
          : null,
      ),
      // Footer notes
      invoice.notes
        ? createElement(
            View,
            { style: styles.footer },
            createElement(Text, { style: styles.sectionTitle }, "Notes"),
            createElement(Text, null, invoice.notes),
          )
        : createElement(
            View,
            { style: styles.footer },
            createElement(
              Text,
              null,
              `Thank you for your business — ${brandName}`,
            ),
          ),
    ),
  )
}

export async function renderInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  return renderToBuffer(buildInvoiceDocument(input))
}
