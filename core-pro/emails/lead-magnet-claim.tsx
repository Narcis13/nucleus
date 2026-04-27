import { Text } from "@react-email/components"

import { BrandShell, type BrandContext } from "./_shell"

// Sent right after a visitor submits the lead-magnet form on the micro-site.
// The CTA carries the single-use claim URL (`/m/claim/<token>`); clicking it
// is what actually creates the lead in the pro's pipeline + delivers the PDF.
// Hardcoded English strings — translation keys can land later when we expand
// the translator coverage; we don't gate the feature on translations existing.

export type LeadMagnetClaimEmailProps = BrandContext & {
  recipientName: string
  magnetTitle: string
  claimUrl: string
  expiresInMinutes: number
}

export default function LeadMagnetClaimEmail(
  props: LeadMagnetClaimEmailProps,
) {
  const firstName = props.recipientName.split(" ")[0] || props.recipientName
  return (
    <BrandShell
      professionalName={props.professionalName}
      branding={props.branding}
      appUrl={props.appUrl}
      unsubscribeUrl={props.unsubscribeUrl}
      locale={props.locale}
      preview={`Confirm to download "${props.magnetTitle}"`}
      heading="Your download is one click away"
      intro={`Hi ${firstName} — thanks for requesting "${props.magnetTitle}". To make sure this address is yours, click the button below to confirm and start the download.`}
      cta={{ label: "Confirm and download", href: props.claimUrl }}
      footerNote={`This link expires in ${props.expiresInMinutes} minutes and can only be used once.`}
    >
      <Text style={{ fontSize: "13px", color: "#475569", margin: "12px 0 0" }}>
        Didn&apos;t request this? You can safely ignore the email — nothing was
        added to {props.professionalName}&apos;s contacts.
      </Text>
    </BrandShell>
  )
}
