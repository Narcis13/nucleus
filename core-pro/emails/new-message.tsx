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

// Richer "new message" email — used instead of the generic template when we
// have the sender's name + preview in hand, so the recipient can triage
// without opening the app. Falls back to the same visual shell as the
// appointment reminder email for consistency.

export type NewMessageEmailProps = {
  recipientName: string | null
  senderName: string
  preview: string | null
  threadUrl: string
  appUrl: string
}

export default function NewMessageEmail(props: NewMessageEmailProps) {
  const firstName = props.recipientName?.split(" ")[0] ?? null

  return (
    <Html>
      <Head />
      <Preview>
        New message from {props.senderName}
        {props.preview ? ` — ${props.preview.slice(0, 80)}` : ""}
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
            New message from {props.senderName}
          </Heading>
          {firstName && (
            <Text style={{ fontSize: "14px", color: "#475569", margin: 0 }}>
              Hi {firstName},
            </Text>
          )}
          <Text style={{ fontSize: "14px", color: "#334155", marginTop: "8px" }}>
            You have a new message waiting for you.
          </Text>

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

          <Hr style={{ borderColor: "#e2e8f0", margin: "20px 0" }} />

          <Button
            href={props.threadUrl}
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
            Reply
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
