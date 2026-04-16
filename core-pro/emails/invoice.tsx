import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components"

// Single React Email template that covers every invoice-lifecycle mail we
// send: the initial "here's your invoice", dunning reminders at 1/7/14 days
// overdue, and the paid receipt. Variant drives copy only — the line-items
// block and the totals block stay identical so the visual language stays
// consistent.

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

export type InvoiceEmailProps = {
  kind: InvoiceEmailKind
  invoiceNumber: string
  recipientName: string
  professionalName: string
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

const HEADINGS: Record<InvoiceEmailKind, string> = {
  issued: "New invoice from",
  reminder_friendly: "Friendly reminder: invoice due",
  reminder_firm: "Your invoice is overdue",
  reminder_final: "Final notice: invoice overdue",
  receipt: "Payment received — thank you",
}

function leadFor(props: InvoiceEmailProps): string {
  const name = props.recipientName.split(" ")[0] || props.recipientName
  switch (props.kind) {
    case "issued":
      return `Hi ${name}, here is invoice ${props.invoiceNumber} from ${props.professionalName}. Details below.`
    case "reminder_friendly":
      return `Hi ${name}, just a quick nudge — invoice ${props.invoiceNumber} was due ${props.daysOverdue} day${props.daysOverdue === 1 ? "" : "s"} ago.`
    case "reminder_firm":
      return `Hi ${name}, invoice ${props.invoiceNumber} is now ${props.daysOverdue} days overdue. Please settle at your earliest convenience.`
    case "reminder_final":
      return `Hi ${name}, this is the final reminder for invoice ${props.invoiceNumber}, now ${props.daysOverdue} days overdue.`
    case "receipt":
      return `Hi ${name}, we received your payment for invoice ${props.invoiceNumber}. Receipt below.`
  }
}

export default function InvoiceEmail(props: InvoiceEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {HEADINGS[props.kind]} {props.kind === "issued" ? props.professionalName : props.invoiceNumber}
      </Preview>
      <Body
        style={{
          backgroundColor: "#f6f7f9",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            margin: "32px auto",
            padding: "32px",
            borderRadius: "12px",
            maxWidth: "600px",
          }}
        >
          <Heading
            style={{
              fontSize: "20px",
              fontWeight: 600,
              color: "#0f172a",
              marginBottom: "8px",
            }}
          >
            {HEADINGS[props.kind]}{" "}
            {props.kind === "issued" ? props.professionalName : ""}
          </Heading>
          <Text style={{ fontSize: "14px", color: "#475569", marginTop: "4px" }}>
            {leadFor(props)}
          </Text>

          <Hr style={{ borderColor: "#e2e8f0", margin: "20px 0" }} />

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

          <Hr style={{ borderColor: "#e2e8f0", margin: "20px 0" }} />

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

          <Hr style={{ borderColor: "#e2e8f0", margin: "20px 0" }} />

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
              <Hr style={{ borderColor: "#e2e8f0", margin: "20px 0" }} />
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

          <Hr style={{ borderColor: "#e2e8f0", margin: "20px 0" }} />
          <Text style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
            View or download this invoice at {props.portalUrl}.
          </Text>
        </Container>
      </Body>
    </Html>
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
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(value)
  } catch {
    // Unknown currency code — fall back to a bare number + suffix.
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
