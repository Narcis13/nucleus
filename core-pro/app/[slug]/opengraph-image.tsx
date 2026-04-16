import { ImageResponse } from "next/og"

import { getPublicMicroSite } from "@/lib/db/queries/micro-sites"
import { env } from "@/lib/env"

// ─────────────────────────────────────────────────────────────────────────────
// Per-slug Open Graph image
//
// Pure JSX → PNG via `next/og`. Reuses the site's branding palette so each
// professional's social share card looks on-brand without a design tool.
// Runs under the Node runtime so it can share our postgres-backed DB client
// (the edge runtime can't load the `postgres` driver).
// ─────────────────────────────────────────────────────────────────────────────
export const revalidate = 600
export const alt = "Professional services"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const site = await getPublicMicroSite(slug)

  const primary = site?.sections.branding.primary_color || "#6366f1"
  const accent =
    site?.sections.branding.accent_color ||
    site?.sections.branding.secondary_color ||
    "#f59e0b"
  const headline =
    site?.seoTitle ||
    site?.sections.sections.hero.headline ||
    site?.professional.fullName ||
    env.NEXT_PUBLIC_APP_NAME

  const subheadline =
    site?.seoDescription ||
    site?.sections.sections.hero.subheadline ||
    site?.professional.bio ||
    ""

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`,
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: "24px",
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            opacity: 0.8,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(255,255,255,0.2)",
            }}
          />
          {env.NEXT_PUBLIC_APP_NAME}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            maxWidth: "900px",
          }}
        >
          <div
            style={{
              fontSize: "72px",
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            {headline}
          </div>
          {subheadline ? (
            <div
              style={{
                fontSize: "28px",
                lineHeight: 1.35,
                opacity: 0.85,
              }}
            >
              {subheadline.length > 180
                ? `${subheadline.slice(0, 177)}…`
                : subheadline}
            </div>
          ) : null}
        </div>
      </div>
    ),
    {
      ...size,
    },
  )
}
