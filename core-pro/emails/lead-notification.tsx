import { Section, Text } from "@react-email/components"

import { BrandShell, type BrandContext } from "./_shell"

// Sent to a professional when a new lead is captured by the public micro-site
// or contact form. Surfaces the lead's contact details + first message inline
// so the professional can reply from the inbox without opening the app.

export type LeadNotificationEmailProps = BrandContext & {
  recipientName: string
  leadName: string
  leadEmail: string | null
  leadPhone: string | null
  source: string | null
  message: string | null
  leadUrl: string
  capturedAtIso: string
}

export default function LeadNotificationEmail(
  props: LeadNotificationEmailProps,
) {
  const firstName =
    props.recipientName.split(" ")[0] || props.recipientName
  const captured = new Date(props.capturedAtIso).toLocaleString(undefined, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <BrandShell
      professionalName={props.professionalName}
      branding={props.branding}
      appUrl={props.appUrl}
      unsubscribeUrl={props.unsubscribeUrl}
      preview={`New lead: ${props.leadName}${
        props.source ? ` (via ${props.source})` : ""
      }`}
      heading="New lead captured"
      intro={`Hi ${firstName}, you have a new enquiry${props.source ? ` via ${props.source}` : ""}.`}
      cta={{ label: "Open lead", href: props.leadUrl }}
      footerNote={`Captured on ${captured}. Reply within 24h to convert ~3× more leads.`}
    >
      <Section>
        <Row label="Name" value={props.leadName} />
        {props.leadEmail && <Row label="Email" value={props.leadEmail} />}
        {props.leadPhone && <Row label="Phone" value={props.leadPhone} />}
        {props.source && <Row label="Source" value={props.source} />}
      </Section>

      {props.message && (
        <Section
          style={{
            backgroundColor: "#f1f5f9",
            borderLeft: "3px solid #0f172a",
            borderRadius: "6px",
            padding: "12px 16px",
            margin: "16px 0",
          }}
        >
          <Text
            style={{
              margin: 0,
              fontSize: "12px",
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "4px",
            }}
          >
            Message
          </Text>
          <Text
            style={{
              margin: 0,
              fontSize: "14px",
              color: "#0f172a",
              whiteSpace: "pre-wrap",
            }}
          >
            {props.message}
          </Text>
        </Section>
      )}
    </BrandShell>
  )
}

function Row({ label, value }: { label: string; value: string }) {
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
