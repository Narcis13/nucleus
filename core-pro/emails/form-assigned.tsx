import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from "@react-email/components"

// "Form assigned" email — sent to a client when the professional assigns them
// a form to complete. Includes an explicit due date (when set) so the client
// can tell at a glance whether it's urgent.

export type FormAssignedEmailProps = {
  recipientName: string | null
  professionalName: string
  formTitle: string
  dueAtIso: string | null
  formUrl: string
  appUrl: string
}

export default function FormAssignedEmail(props: FormAssignedEmailProps) {
  const firstName = props.recipientName?.split(" ")[0] ?? null
  const dueLabel = props.dueAtIso
    ? new Date(props.dueAtIso).toLocaleDateString(undefined, {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null

  return (
    <Html>
      <Head />
      <Preview>
        {props.professionalName} sent you a form: {props.formTitle}
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
            You&apos;ve been sent a form
          </Heading>
          {firstName && (
            <Text style={{ fontSize: "14px", color: "#475569", margin: 0 }}>
              Hi {firstName},
            </Text>
          )}
          <Text style={{ fontSize: "14px", color: "#334155", marginTop: "8px" }}>
            {props.professionalName} has assigned you a form to complete:{" "}
            <strong>{props.formTitle}</strong>.
          </Text>

          {dueLabel && (
            <Text
              style={{
                fontSize: "14px",
                color: "#0f172a",
                margin: "12px 0 0",
              }}
            >
              <strong>Due:</strong> {dueLabel}
            </Text>
          )}

          <Hr style={{ borderColor: "#e2e8f0", margin: "20px 0" }} />

          <Button
            href={props.formUrl}
            style={{
              backgroundColor: "#0f172a",
              color: "#ffffff",
              padding: "10px 16px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 500,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Complete form
          </Button>

          <Text
            style={{
              fontSize: "12px",
              color: "#94a3b8",
              marginTop: "20px",
            }}
          >
            Manage your notification preferences at {props.appUrl}.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
