import { Container, Text } from "@react-email/components"

import { makeEmailTranslator } from "@/lib/resend/translator"

import { BrandShell, type BrandContext } from "./_shell"

// Sent when a recipient (professional or client) has a new message and email
// delivery is allowed by their preferences. Sender name + preview let the
// recipient triage from the inbox without opening the app.

export type NewMessageEmailProps = BrandContext & {
  recipientName: string | null
  senderName: string
  preview: string | null
  threadUrl: string
}

export default function NewMessageEmail(props: NewMessageEmailProps) {
  const t = makeEmailTranslator(props.locale)

  return (
    <BrandShell
      professionalName={props.professionalName}
      branding={props.branding}
      appUrl={props.appUrl}
      unsubscribeUrl={props.unsubscribeUrl}
      locale={props.locale}
      preview={t("emails.newMessage.preview")}
      heading={t("emails.newMessage.heading")}
      intro={t("emails.newMessage.body", { sender: props.senderName })}
      cta={{ label: t("emails.newMessage.cta"), href: props.threadUrl }}
    >
      {props.preview && (
        <Container
          style={{
            backgroundColor: "#f1f5f9",
            borderLeft: "3px solid #0f172a",
            padding: "12px 16px",
            borderRadius: "6px",
            margin: "16px 0",
          }}
        >
          <Text
            style={{
              fontSize: "14px",
              color: "#0f172a",
              margin: 0,
              whiteSpace: "pre-wrap",
            }}
          >
            {props.preview}
          </Text>
        </Container>
      )}
    </BrandShell>
  )
}
