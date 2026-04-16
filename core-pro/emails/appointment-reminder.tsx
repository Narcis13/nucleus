import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components"

// React Email template for appointment reminders + confirmations.
// Same shape covers 24h reminder, 1h reminder, and the initial booking
// confirmation — kind drives the heading + lead copy only, so we don't have
// three near-identical templates to maintain.

export type AppointmentEmailKind =
  | "confirmation"
  | "reminder_24h"
  | "reminder_1h"
  | "cancellation"

export type AppointmentEmailProps = {
  kind: AppointmentEmailKind
  recipientName: string
  recipientRole: "professional" | "client"
  professionalName: string
  clientName: string | null
  title: string
  startAtIso: string
  endAtIso: string
  location: string | null
  notes: string | null
  appUrl: string
}

const HEADINGS: Record<AppointmentEmailKind, string> = {
  confirmation: "Appointment confirmed",
  reminder_24h: "Reminder: appointment tomorrow",
  reminder_1h: "Starting soon",
  cancellation: "Appointment cancelled",
}

const LEADS: Record<AppointmentEmailKind, string> = {
  confirmation:
    "Your appointment has been added to the calendar. Details below.",
  reminder_24h:
    "Just a heads-up — you have an appointment scheduled for tomorrow.",
  reminder_1h:
    "Your appointment starts in about an hour. Make sure you're ready.",
  cancellation:
    "The appointment below has been cancelled. No action needed.",
}

export default function AppointmentReminderEmail(
  props: AppointmentEmailProps,
) {
  const start = new Date(props.startAtIso)
  const end = new Date(props.endAtIso)
  const dateLabel = start.toLocaleDateString(undefined, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
  const timeLabel = `${start.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })} – ${end.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })}`

  const counterparty =
    props.recipientRole === "professional"
      ? props.clientName ?? "Guest"
      : props.professionalName

  return (
    <Html>
      <Head />
      <Preview>{HEADINGS[props.kind]} — {props.title}</Preview>
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
            maxWidth: "560px",
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
            {HEADINGS[props.kind]}
          </Heading>
          <Text style={{ fontSize: "14px", color: "#475569", margin: 0 }}>
            Hi {props.recipientName.split(" ")[0] || props.recipientName},
          </Text>
          <Text style={{ fontSize: "14px", color: "#475569", marginTop: "4px" }}>
            {LEADS[props.kind]}
          </Text>

          <Hr style={{ borderColor: "#e2e8f0", margin: "20px 0" }} />

          <Section>
            <Row label="What" value={props.title} />
            <Row label="With" value={counterparty} />
            <Row label="When" value={`${dateLabel}, ${timeLabel}`} />
            {props.location && (
              <Row label="Where" value={props.location} />
            )}
            {props.notes && (
              <Row label="Notes" value={props.notes} />
            )}
          </Section>

          <Hr style={{ borderColor: "#e2e8f0", margin: "20px 0" }} />

          <Text
            style={{
              fontSize: "12px",
              color: "#94a3b8",
              margin: 0,
            }}
          >
            Manage this appointment from your{" "}
            {props.recipientRole === "professional"
              ? "dashboard calendar"
              : "client portal"}{" "}
            at {props.appUrl}.
          </Text>
        </Container>
      </Body>
    </Html>
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
