import InvoiceEmail, { type InvoiceEmailProps } from "./invoice"

// Overdue-invoice reminders — friendly / firm / final tiers correspond to the
// dunning cadence in `lib/invoices/reminders.ts`. The underlying template is
// the same as for newly issued invoices; only the heading + lead copy change
// based on `tier`.

export type InvoiceReminderTier = "friendly" | "firm" | "final"

export type InvoiceReminderEmailProps = Omit<InvoiceEmailProps, "kind"> & {
  tier: InvoiceReminderTier
}

const KIND_BY_TIER: Record<InvoiceReminderTier, InvoiceEmailProps["kind"]> = {
  friendly: "reminder_friendly",
  firm: "reminder_firm",
  final: "reminder_final",
}

export default function InvoiceReminderEmail(props: InvoiceReminderEmailProps) {
  const { tier, ...rest } = props
  return InvoiceEmail({ ...rest, kind: KIND_BY_TIER[tier] })
}
