import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"
import type { CSSProperties, ReactNode } from "react"

import { makeEmailTranslator } from "@/lib/resend/translator"
import type { Branding } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// BrandShell — the shared visual container for every transactional email.
//
// A single shell means: consistent paddings + radii, one place to update the
// footer text, one place to splice in the unsubscribe link, and one place that
// resolves the professional's branding (primary color + logo). Inline styles
// only — most email clients still ignore <style> blocks reliably, and
// react-email's Tailwind wrapper has gotchas around iCloud/Outlook so we
// hand-write the CSS we actually need.
// ─────────────────────────────────────────────────────────────────────────────

export type BrandContext = {
  professionalName: string
  branding: Branding | null | undefined
  appUrl: string
  unsubscribeUrl?: string | null
  // BCP-47 / ISO locale of the *recipient*. Drives the strings rendered by
  // this shell and by localized child templates. Optional for backwards
  // compatibility — callers that don't pass one get the product default.
  locale?: string | null
}

export type BrandShellProps = BrandContext & {
  preview: string
  heading: string
  intro?: string | null
  children: ReactNode
  cta?: { label: string; href: string } | null
  footerNote?: string | null
}

const FALLBACK_PRIMARY = "#0f172a"
const FALLBACK_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

export function brandColor(branding: Branding | null | undefined): string {
  const c = branding?.primary_color?.trim()
  if (!c) return FALLBACK_PRIMARY
  // Accept hex (#fff / #ffffff) only — anything else falls back so we don't
  // emit garbage CSS.
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)) return c
  return FALLBACK_PRIMARY
}

export function brandFont(branding: Branding | null | undefined): string {
  return branding?.font?.trim() || FALLBACK_FONT
}

export function defaultUnsubscribeUrl(appUrl: string): string {
  return `${appUrl.replace(/\/$/, "")}/dashboard/settings/notifications`
}

export function BrandShell(props: BrandShellProps) {
  const primary = brandColor(props.branding)
  const font = brandFont(props.branding)
  const logo = props.branding?.logo_url ?? null
  const unsubscribeUrl = props.unsubscribeUrl ?? defaultUnsubscribeUrl(props.appUrl)
  const t = makeEmailTranslator(props.locale)

  const bodyStyle: CSSProperties = {
    backgroundColor: "#f6f7f9",
    fontFamily: font,
    margin: 0,
    padding: 0,
  }

  const containerStyle: CSSProperties = {
    backgroundColor: "#ffffff",
    margin: "32px auto",
    padding: "32px",
    borderRadius: "12px",
    maxWidth: "560px",
    border: "1px solid #e2e8f0",
  }

  const headerStyle: CSSProperties = {
    borderBottom: `3px solid ${primary}`,
    paddingBottom: "16px",
    marginBottom: "20px",
  }

  return (
    <Html>
      <Head />
      <Preview>{props.preview}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            {logo ? (
              <Img
                src={logo}
                alt={props.professionalName}
                height="36"
                style={{ display: "block", maxHeight: "36px" }}
              />
            ) : (
              <Text
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: 600,
                  color: primary,
                  letterSpacing: "-0.01em",
                }}
              >
                {props.professionalName}
              </Text>
            )}
          </Section>

          <Heading
            style={{
              fontSize: "20px",
              fontWeight: 600,
              color: "#0f172a",
              margin: "0 0 8px",
            }}
          >
            {props.heading}
          </Heading>

          {props.intro && (
            <Text style={{ fontSize: "14px", color: "#475569", margin: "0 0 16px" }}>
              {props.intro}
            </Text>
          )}

          {props.children}

          {props.cta && (
            <Section style={{ margin: "24px 0 8px" }}>
              <Button
                href={props.cta.href}
                style={{
                  backgroundColor: primary,
                  color: "#ffffff",
                  padding: "12px 18px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                {props.cta.label}
              </Button>
            </Section>
          )}

          {props.footerNote && (
            <Text
              style={{
                fontSize: "13px",
                color: "#475569",
                marginTop: "16px",
              }}
            >
              {props.footerNote}
            </Text>
          )}

          <Hr style={{ borderColor: "#e2e8f0", margin: "28px 0 16px" }} />

          <Text style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
            {t("emails.common.poweredBy")} —{" "}
            <Link href={props.appUrl} style={{ color: "#94a3b8" }}>
              {hostFor(props.appUrl)}
            </Link>
          </Text>
          <Text style={{ fontSize: "12px", color: "#94a3b8", margin: "4px 0 0" }}>
            <Link href={unsubscribeUrl} style={{ color: "#94a3b8" }}>
              {t("emails.common.openInBrowser")}
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

function hostFor(appUrl: string): string {
  try {
    return new URL(appUrl).host
  } catch {
    return appUrl
  }
}
