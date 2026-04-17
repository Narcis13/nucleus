import { Hr, Row, Section, Text } from "@react-email/components"

import { formatCurrency } from "@/lib/i18n/format"
import { makeEmailTranslator } from "@/lib/resend/translator"

import { BrandShell, type BrandContext } from "./_shell"

// Single React Email template that covers every invoice-lifecycle mail we
// send: the initial "here's your invoice", dunning reminders at 1/7/14 days
// overdue, and the paid receipt. Variant drives copy only — the line-items
// block and the totals block stay identical so the visual language stays
// consistent. Wrapped by the canonical `invoice-sent` and `invoice-reminder`
// modules in the template registry.

export type InvoiceEmailKind =
  | "issued"
  | "reminder_friendly"
  | "reminder_firm"
  | "reminder_final"
  | "receipt"

export type InvoiceEmailLineItem = {
  description: string
  quantity: number
  unit_price: number
  amount: number
}

export type InvoiceEmailProps = BrandContext & {
  kind: InvoiceEmailKind
  invoiceNumber: string
  recipientName: string
  lineItems: InvoiceEmailLineItem[]
  subtotal: number
  taxAmount: number
  discount: number
  total: number
  paidAmount: number
  balanceDue: number
  currency: string
  issueDate: string
  dueDate: string
  daysOverdue: number | null
  terms: string
  notes: string | null
  paymentMethod?: string | null
  paymentReference?: string | null
  portalUrl: string
}

export default function InvoiceEmail(props: InvoiceEmailProps) {
  const t = makeEmailTranslator(props.locale)
  const firstName =
    props.recipientName.split(" ")[0] || props.recipientName
  const totalFormatted = formatCurrency(props.total, {
    locale: props.locale ?? undefined,
    currency: props.currency,
  })
  const isReminder = props.kind !== "issued" && props.kind !== "receipt"
  const intlKey = isReminder
    ? "emails.invoiceReminder"
    : props.kind === "receipt"
      ? "emails.invoiceSent"
      : "emails.invoice"

  return (
    <BrandShell
      professionalName={props.professionalName}
      branding={props.branding}
      appUrl={props.appUrl}
      unsubscribeUrl={props.unsubscribeUrl}
      locale={props.locale}
      preview={t(`${intlKey}.preview`)}
      heading={t(`${intlKey}.heading`, { number: props.invoiceNumber })}
      intro={`${t("emails.common.greeting", { name: firstName })} ${t(`${intlKey}.body`, {
        number: props.invoiceNumber,
        amount: totalFormatted,
        dueDate: props.dueDate,
        recipient: props.recipientName,
      })}`}
      cta={{ label: t(`${intlKey}.cta`), href: props.portalUrl }}
    >
      <Section>
        <InfoRow label="Invoice" value={props.invoiceNumber} />
        <InfoRow label="Issued" value={props.issueDate} />
        <InfoRow label="Due" value={props.dueDate} />
        <InfoRow label="Terms" value={props.terms} />
        {props.kind === "receipt" && props.paymentMethod && (
          <InfoRow
            label="Paid via"
            value={
              props.paymentReference
                ? `${props.paymentMethod} (${props.paymentReference})`
                : props.paymentMethod
            }
          />
        )}
      </Section>

      <Hr style={{ borderColor: "#e2e8f0", margin: "16px 0" }} />

      <Section>
        <Row>
          <Text
            style={{
              margin: 0,
              fontSize: "12px",
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Line items
          </Text>
        </Row>
        {props.lineItems.map((li, i) => (
          <LineItemRow
            key={`${li.description}-${i}`}
            item={li}
            currency={props.currency}
          />
        ))}
      </Section>

      <Hr style={{ borderColor: "#e2e8f0", margin: "16px 0" }} />

      <Section>
        <TotalRow label="Subtotal" value={props.subtotal} currency={props.currency} />
        {props.discount > 0 && (
          <TotalRow
            label="Discount"
            value={-props.discount}
            currency={props.currency}
          />
        )}
        {props.taxAmount > 0 && (
          <TotalRow label="Tax" value={props.taxAmount} currency={props.currency} />
        )}
        <TotalRow
          label="Total"
          value={props.total}
          currency={props.currency}
          emphasis
        />
        {props.paidAmount > 0 && (
          <TotalRow
            label="Paid"
            value={-props.paidAmount}
            currency={props.currency}
          />
        )}
        {props.kind !== "receipt" && props.balanceDue > 0 && (
          <TotalRow
            label="Balance due"
            value={props.balanceDue}
            currency={props.currency}
            emphasis
          />
        )}
      </Section>

      {props.notes && (
        <>
          <Hr style={{ borderColor: "#e2e8f0", margin: "16px 0" }} />
          <Section>
            <Text
              style={{
                fontSize: "12px",
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "4px",
              }}
            >
              Notes
            </Text>
            <Text style={{ fontSize: "14px", color: "#0f172a", margin: 0 }}>
              {props.notes}
            </Text>
          </Section>
        </>
      )}
    </BrandShell>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Text
      style={{
        fontSize: "14px",
        color: "#0f172a",
        margin: "6px 0",
      }}
    >
      <strong style={{ color: "#475569" }}>{label}: </strong>
      {value}
    </Text>
  )
}

function formatMoney(value: number, currency: string): string {
  try {
    return formatCurrency(value, { currency })
  } catch {
    return `${value.toFixed(2)} ${currency}`
  }
}

function LineItemRow({
  item,
  currency,
}: {
  item: InvoiceEmailLineItem
  currency: string
}) {
  return (
    <Text
      style={{
        fontSize: "14px",
        color: "#0f172a",
        margin: "4px 0",
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <span>
        {item.description}
        {item.quantity !== 1 && (
          <span style={{ color: "#94a3b8" }}>
            {" "}
            · {item.quantity} × {formatMoney(item.unit_price, currency)}
          </span>
        )}
      </span>
      <strong>{formatMoney(item.amount, currency)}</strong>
    </Text>
  )
}

function TotalRow({
  label,
  value,
  currency,
  emphasis,
}: {
  label: string
  value: number
  currency: string
  emphasis?: boolean
}) {
  return (
    <Text
      style={{
        fontSize: emphasis ? "16px" : "14px",
        color: emphasis ? "#0f172a" : "#475569",
        fontWeight: emphasis ? 600 : 400,
        margin: "4px 0",
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <span>{label}</span>
      <span>{formatMoney(value, currency)}</span>
    </Text>
  )
}
