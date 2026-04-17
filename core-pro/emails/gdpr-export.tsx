import { Text } from "@react-email/components"

import { BrandShell, type BrandContext } from "./_shell"

// Sent when a GDPR data-export request finishes processing. The download URL
// is a signed Supabase storage URL — the caller decides the TTL; this
// template surfaces the human-readable expiry so the recipient knows when the
// link goes dead.

export type GdprExportEmailProps = BrandContext & {
  recipientName: string | null
  downloadUrl: string
  expiresAtIso: string
  fileSizeBytes: number | null
  requestedAtIso: string
}

export default function GdprExportEmail(props: GdprExportEmailProps) {
  const firstName = props.recipientName?.split(" ")[0] ?? null
  const intro = firstName
    ? `Hi ${firstName}, your data export is ready.`
    : "Your data export is ready."
  const expiresAt = new Date(props.expiresAtIso).toLocaleString(undefined, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <BrandShell
      professionalName={props.professionalName}
      branding={props.branding}
      appUrl={props.appUrl}
      unsubscribeUrl={props.unsubscribeUrl}
      preview="Your personal-data export is ready to download"
      heading="Your data export is ready"
      intro={intro}
      cta={{ label: "Download archive", href: props.downloadUrl }}
      footerNote={`This download link expires on ${expiresAt}. After that, request a new export from your settings.`}
    >
      <Text style={{ fontSize: "14px", color: "#334155", margin: "0 0 12px" }}>
        We&apos;ve packaged everything we hold about you into a single archive —
        your profile, messages, appointments, forms, invoices, and uploaded
        files.
      </Text>

      {props.fileSizeBytes !== null && (
        <Text style={{ fontSize: "14px", color: "#0f172a", margin: "6px 0" }}>
          <strong style={{ color: "#475569" }}>Size: </strong>
          {humanSize(props.fileSizeBytes)}
        </Text>
      )}

      <Text style={{ fontSize: "13px", color: "#94a3b8", margin: "16px 0 0" }}>
        Requested on{" "}
        {new Date(props.requestedAtIso).toLocaleDateString(undefined, {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}
        . If you didn&apos;t request this export, contact support immediately.
      </Text>
    </BrandShell>
  )
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ["KB", "MB", "GB"]
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(1)} ${units[unit]}`
}
