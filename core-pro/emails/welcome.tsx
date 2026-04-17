import { Section, Text } from "@react-email/components"

import { makeEmailTranslator } from "@/lib/resend/translator"

import { BrandShell, type BrandContext } from "./_shell"

// Sent right after a professional finishes signup. The "professional" here is
// the recipient — they're the new tenant — so the brand on the shell is
// CorePro itself rather than their (not-yet-configured) workspace branding.

export type WelcomeEmailProps = BrandContext & {
  recipientName: string
  dashboardUrl: string
}

export default function WelcomeEmail(props: WelcomeEmailProps) {
  const firstName = props.recipientName.split(" ")[0] || props.recipientName
  const t = makeEmailTranslator(props.locale)
  const workspace = props.professionalName
  return (
    <BrandShell
      professionalName={props.professionalName}
      branding={props.branding}
      appUrl={props.appUrl}
      unsubscribeUrl={props.unsubscribeUrl}
      locale={props.locale}
      preview={t("emails.welcome.preview")}
      heading={t("emails.welcome.heading", { name: firstName })}
      intro={t("emails.welcome.body", { name: firstName, workspace })}
      cta={{
        label: t("emails.welcome.cta"),
        href: props.dashboardUrl,
      }}
    >
      <Section>
        <Step
          n={1}
          title="Add your branding"
          body="Upload a logo and choose a primary color so every client touchpoint feels like yours."
        />
        <Step
          n={2}
          title="Set up your services"
          body="Define what you offer, durations, and prices — clients can then book online."
        />
        <Step
          n={3}
          title="Invite your first client"
          body="Send a portal invite — they get appointments, messages, forms, and invoices in one place."
        />
      </Section>

      <Text style={{ fontSize: "13px", color: "#475569", marginTop: "16px" }}>
        Need a hand? Reply to this email and a human will get back to you.
      </Text>
    </BrandShell>
  )
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <Text style={{ margin: "12px 0", fontSize: "14px", color: "#0f172a" }}>
      <strong>{n}. {title}</strong>
      <br />
      <span style={{ color: "#475569" }}>{body}</span>
    </Text>
  )
}
