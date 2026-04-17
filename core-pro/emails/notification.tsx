import { Text } from "@react-email/components"

import { BrandShell, type BrandContext } from "./_shell"

// Generic notification email used by `lib/notifications/send.ts`. Designed so
// the same template can cover any notification type (message, appointment,
// form, …) — the caller provides title, body, and an optional link.

export type NotificationEmailProps = Partial<BrandContext> & {
  recipientName: string | null
  title: string
  body: string | null
  link: string | undefined
  appUrl: string
}

export default function NotificationEmail(props: NotificationEmailProps) {
  const firstName = props.recipientName?.split(" ")[0] ?? null
  const intro = firstName ? `Hi ${firstName},` : null

  return (
    <BrandShell
      professionalName={props.professionalName ?? "CorePro"}
      branding={props.branding ?? null}
      appUrl={props.appUrl}
      unsubscribeUrl={props.unsubscribeUrl}
      preview={props.body ?? props.title}
      heading={props.title}
      intro={intro}
      cta={props.link ? { label: "Open", href: props.link } : null}
    >
      {props.body && (
        <Text
          style={{
            fontSize: "14px",
            color: "#334155",
            margin: "0 0 12px",
            whiteSpace: "pre-wrap",
          }}
        >
          {props.body}
        </Text>
      )}
    </BrandShell>
  )
}
