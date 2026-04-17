import { Text } from "@react-email/components"

import { BrandShell, type BrandContext } from "./_shell"

// "Form assigned" email — sent to a client when the professional assigns them
// a form to complete. Includes an explicit due date (when set) so the client
// can tell at a glance whether it's urgent.

export type FormAssignedEmailProps = BrandContext & {
  recipientName: string | null
  formTitle: string
  dueAtIso: string | null
  formUrl: string
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
  const intro = firstName
    ? `Hi ${firstName}, ${props.professionalName} has assigned you a form to complete.`
    : `${props.professionalName} has assigned you a form to complete.`

  return (
    <BrandShell
      professionalName={props.professionalName}
      branding={props.branding}
      appUrl={props.appUrl}
      unsubscribeUrl={props.unsubscribeUrl}
      preview={`${props.professionalName} sent you a form: ${props.formTitle}`}
      heading="You've been sent a form"
      intro={intro}
      cta={{ label: "Complete form", href: props.formUrl }}
    >
      <Text
        style={{
          fontSize: "14px",
          color: "#0f172a",
          margin: "0 0 8px",
        }}
      >
        <strong>Form:</strong> {props.formTitle}
      </Text>
      {dueLabel && (
        <Text
          style={{
            fontSize: "14px",
            color: "#0f172a",
            margin: "0 0 8px",
          }}
        >
          <strong>Due:</strong> {dueLabel}
        </Text>
      )}
    </BrandShell>
  )
}
