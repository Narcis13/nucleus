import { Section, Text } from "@react-email/components"

import { formatDate, formatTime } from "@/lib/i18n/format"
import { makeEmailTranslator } from "@/lib/resend/translator"

import { BrandShell, type BrandContext } from "./_shell"

// React Email template for appointment reminders + confirmations + cancellations.
// One template covers all four kinds — kind drives the heading + lead copy
// only, so we don't have three near-identical templates to maintain. The
// dedicated `appointment-confirmation.tsx` module is a thin wrapper that always
// passes `kind: "confirmation"` for callers that prefer the explicit name.

export type AppointmentEmailKind =
  | "confirmation"
  | "reminder_24h"
  | "reminder_1h"
  | "cancellation"

export type AppointmentEmailProps = BrandContext & {
  kind: AppointmentEmailKind
  recipientName: string
  recipientRole: "professional" | "client"
  clientName: string | null
  title: string
  startAtIso: string
  endAtIso: string
  location: string | null
  notes: string | null
  manageUrl?: string | null
}

export default function AppointmentReminderEmail(
  props: AppointmentEmailProps,
) {
  const t = makeEmailTranslator(props.locale)
  const start = new Date(props.startAtIso)
  const end = new Date(props.endAtIso)
  const dateLabel = formatDate(start, { locale: props.locale ?? undefined, style: "full" })
  const timeLabel = `${formatTime(start, { locale: props.locale ?? undefined })} – ${formatTime(end, { locale: props.locale ?? undefined })}`

  const counterparty =
    props.recipientRole === "professional"
      ? props.clientName ?? "Guest"
      : props.professionalName

  const firstName =
    props.recipientName.split(" ")[0] || props.recipientName

  const manageUrl =
    props.manageUrl ??
    (props.recipientRole === "professional"
      ? `${props.appUrl.replace(/\/$/, "")}/dashboard/calendar`
      : `${props.appUrl.replace(/\/$/, "")}/portal/appointments`)

  const isConfirmation = props.kind === "confirmation"
  const intlKey = isConfirmation
    ? "emails.appointmentConfirmation"
    : "emails.appointmentReminder"

  return (
    <BrandShell
      professionalName={props.professionalName}
      branding={props.branding}
      appUrl={props.appUrl}
      unsubscribeUrl={props.unsubscribeUrl}
      locale={props.locale}
      preview={t(`${intlKey}.preview`)}
      heading={t(`${intlKey}.heading`)}
      intro={t(`${intlKey}.body`, {
        title: props.title,
        date: dateLabel,
        time: timeLabel,
      })}
      cta={
        props.kind === "cancellation"
          ? null
          : { label: t(`${intlKey}.cta`), href: manageUrl }
      }
    >
      <Section>
        <Text style={{ margin: "6px 0", fontSize: "14px", color: "#0f172a" }}>
          <strong>{firstName},</strong>
        </Text>
        <Row label="What" value={props.title} />
        <Row label="With" value={counterparty} />
        <Row label="When" value={`${dateLabel}, ${timeLabel}`} />
        {props.location && <Row label="Where" value={props.location} />}
        {props.notes && <Row label="Notes" value={props.notes} />}
      </Section>
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
