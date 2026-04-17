import { Hr, Section, Text } from "@react-email/components"

import { BrandShell, type BrandContext } from "./_shell"

// Weekly digest sent to professionals every Monday morning. Numbers come from
// `lib/analytics` and are pre-aggregated so this template can stay dumb. The
// "Money" block is suppressed when `currency` is null (e.g. workspace hasn't
// configured invoicing yet) — silencing zero-revenue lines reads as more
// honest than always showing a 0.

export type WeeklySummaryEmailProps = BrandContext & {
  recipientName: string
  weekStartIso: string
  weekEndIso: string
  appointmentsCompleted: number
  appointmentsUpcoming: number
  newLeads: number
  newClients: number
  messagesReceived: number
  invoicedAmount: number | null
  collectedAmount: number | null
  outstandingAmount: number | null
  currency: string | null
  topClient: { name: string; sessions: number } | null
  dashboardUrl: string
}

export default function WeeklySummaryEmail(props: WeeklySummaryEmailProps) {
  const firstName =
    props.recipientName.split(" ")[0] || props.recipientName
  const range = formatRange(props.weekStartIso, props.weekEndIso)

  return (
    <BrandShell
      professionalName={props.professionalName}
      branding={props.branding}
      appUrl={props.appUrl}
      unsubscribeUrl={props.unsubscribeUrl}
      preview={`Your week in numbers — ${range}`}
      heading="Your week in review"
      intro={`Hi ${firstName}, here's what happened in your practice this week (${range}).`}
      cta={{ label: "Open dashboard", href: props.dashboardUrl }}
    >
      <Section>
        <SectionLabel>Appointments</SectionLabel>
        <Stat label="Completed" value={String(props.appointmentsCompleted)} />
        <Stat label="Upcoming next 7 days" value={String(props.appointmentsUpcoming)} />
      </Section>

      <Hr style={{ borderColor: "#e2e8f0", margin: "16px 0" }} />

      <Section>
        <SectionLabel>Pipeline</SectionLabel>
        <Stat label="New leads" value={String(props.newLeads)} />
        <Stat label="New clients" value={String(props.newClients)} />
        <Stat label="Messages received" value={String(props.messagesReceived)} />
      </Section>

      {props.currency && (
        <>
          <Hr style={{ borderColor: "#e2e8f0", margin: "16px 0" }} />
          <Section>
            <SectionLabel>Money</SectionLabel>
            {props.invoicedAmount !== null && (
              <Stat
                label="Invoiced"
                value={formatMoney(props.invoicedAmount, props.currency)}
              />
            )}
            {props.collectedAmount !== null && (
              <Stat
                label="Collected"
                value={formatMoney(props.collectedAmount, props.currency)}
              />
            )}
            {props.outstandingAmount !== null && (
              <Stat
                label="Outstanding"
                value={formatMoney(props.outstandingAmount, props.currency)}
              />
            )}
          </Section>
        </>
      )}

      {props.topClient && (
        <>
          <Hr style={{ borderColor: "#e2e8f0", margin: "16px 0" }} />
          <Text style={{ fontSize: "14px", color: "#475569", margin: 0 }}>
            <strong style={{ color: "#0f172a" }}>Most active client:</strong>{" "}
            {props.topClient.name} ({props.topClient.sessions} session
            {props.topClient.sessions === 1 ? "" : "s"}).
          </Text>
        </>
      )}
    </BrandShell>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      style={{
        margin: "0 0 6px",
        fontSize: "12px",
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {children}
    </Text>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
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
      <span style={{ color: "#475569" }}>{label}</span>
      <strong>{value}</strong>
    </Text>
  )
}

function formatRange(startIso: string, endIso: string): string {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { day: "2-digit", month: "short" })
  return `${fmt(start)} – ${fmt(end)}`
}

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(value)
  } catch {
    return `${value.toFixed(2)} ${currency}`
  }
}
