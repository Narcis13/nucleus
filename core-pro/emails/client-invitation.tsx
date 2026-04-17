import { Section, Text } from "@react-email/components"

import { makeEmailTranslator } from "@/lib/resend/translator"

import { BrandShell, type BrandContext } from "./_shell"

// Sent when a professional invites a client to the portal. The CTA carries the
// (already-tokenised) Clerk invitation URL — we don't generate it here, the
// caller is responsible for that.

export type ClientInvitationEmailProps = BrandContext & {
  recipientName: string | null
  inviteUrl: string
  expiresInDays?: number | null
  customMessage?: string | null
}

export default function ClientInvitationEmail(
  props: ClientInvitationEmailProps,
) {
  const t = makeEmailTranslator(props.locale)
  const firstName = props.recipientName?.split(" ")[0] ?? null
  const greeting = firstName
    ? t("emails.common.greeting", { name: firstName })
    : t("emails.common.greeting", { name: "" })
  const expiry = props.expiresInDays
    ? `${props.expiresInDays} day${props.expiresInDays === 1 ? "" : "s"}.`
    : null

  return (
    <BrandShell
      professionalName={props.professionalName}
      branding={props.branding}
      appUrl={props.appUrl}
      unsubscribeUrl={props.unsubscribeUrl}
      locale={props.locale}
      preview={t("emails.clientInvitation.preview")}
      heading={t("emails.clientInvitation.heading")}
      intro={`${greeting} ${t("emails.clientInvitation.body", { sender: props.professionalName })}`}
      cta={{ label: t("emails.clientInvitation.cta"), href: props.inviteUrl }}
      footerNote={expiry}
    >
      <Text style={{ fontSize: "14px", color: "#334155", margin: "0 0 12px" }}>
        Inside the portal you can book appointments, exchange messages, fill in
        forms, and view your invoices — all in one place.
      </Text>

      {props.customMessage && (
        <Section
          style={{
            backgroundColor: "#f1f5f9",
            borderRadius: "8px",
            padding: "12px 16px",
            margin: "12px 0",
          }}
        >
          <Text
            style={{
              margin: 0,
              fontSize: "14px",
              color: "#0f172a",
              whiteSpace: "pre-wrap",
            }}
          >
            {props.customMessage}
          </Text>
        </Section>
      )}

      <Text
        style={{
          fontSize: "12px",
          color: "#94a3b8",
          margin: "12px 0 0",
        }}
      >
        If you weren&apos;t expecting this invitation you can safely ignore it.
      </Text>
    </BrandShell>
  )
}
