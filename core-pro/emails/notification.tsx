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

// Generic notification email used by `lib/notifications/send.ts`. Designed so
// the same template can cover any notification type (message, appointment,
// form, …) — the caller provides title, body, and an optional link. The
// payload stays tiny and the shape matches what the in-app notification row
// stores, so the two surfaces never drift.

export type NotificationEmailProps = {
  recipientName: string | null
  title: string
  body: string | null
  link: string | undefined
  appUrl: string
}

export default function NotificationEmail(props: NotificationEmailProps) {
  const firstName = props.recipientName?.split(" ")[0] ?? null

  return (
    <Html>
      <Head />
      <Preview>{props.body ?? props.title}</Preview>
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
            {props.title}
          </Heading>
          {firstName && (
            <Text style={{ fontSize: "14px", color: "#475569", margin: 0 }}>
              Hi {firstName},
            </Text>
          )}
          {props.body && (
            <Text
              style={{
                fontSize: "14px",
                color: "#334155",
                marginTop: "8px",
                whiteSpace: "pre-wrap",
              }}
            >
              {props.body}
            </Text>
          )}

          {props.link && (
            <>
              <Hr style={{ borderColor: "#e2e8f0", margin: "20px 0" }} />
              <Button
                href={props.link}
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
                Open
              </Button>
            </>
          )}

          <Hr style={{ borderColor: "#e2e8f0", margin: "20px 0" }} />
          <Text style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
            You can manage which notifications you receive from your settings at{" "}
            {props.appUrl}.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
