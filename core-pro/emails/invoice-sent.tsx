import InvoiceEmail, { type InvoiceEmailProps } from "./invoice"

// "Here's your invoice" — the initial mail sent when an invoice transitions
// to `sent` status. Thin wrapper so the template registry can address this
// case by its canonical name.

export type InvoiceSentEmailProps = Omit<
  InvoiceEmailProps,
  "kind" | "daysOverdue"
>

export default function InvoiceSentEmail(props: InvoiceSentEmailProps) {
  return InvoiceEmail({ ...props, kind: "issued", daysOverdue: null })
}
