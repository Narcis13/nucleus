import { redirect } from "next/navigation"
import type { CSSProperties } from "react"

import { PortalHeader } from "@/components/portal/header"
import { PortalMobileNav } from "@/components/portal/mobile-nav"
import { getCurrentClerkUserId } from "@/lib/clerk/helpers"
import { getProfessionalForClientPortal } from "@/lib/db/queries/professionals"
import { getPortalLocalePreference } from "@/lib/db/queries/portal-locale"
import { syncLocaleFromDb } from "@/lib/i18n/locale"
import type { Branding } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// Client portal layout
//
// The client-facing counterpart to the dashboard shell. Renders:
//   • A branded top header with the professional's logo + name + primary nav.
//   • The segment's content in a centered max-width column.
//   • A mobile bottom tab bar (hidden on ≥ md).
//
// Branding is applied as scoped CSS variables on the wrapper: downstream
// components read `var(--primary)` etc. and automatically pick up the
// professional's colours, so we don't have to thread props deep into the tree.
//
// Auth: the route is already covered by Clerk's middleware (`/portal(.*)`),
// but we also gate here to avoid a brief flash of chrome on a cold navigation.
// ─────────────────────────────────────────────────────────────────────────────
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const clerkUserId = await getCurrentClerkUserId()
  if (!clerkUserId) {
    redirect("/sign-in?redirect_url=/portal")
  }

  // Seed the locale cookie from the DB on first visit so the portal paints
  // in the right language before the client ever opens the switcher. A no-op
  // once the cookie exists — the switcher is always authoritative after that.
  const localePreference = await getPortalLocalePreference()
  await syncLocaleFromDb(localePreference)

  // Resolve the professional by the client's active Clerk org. May legitimately
  // be null — e.g. a signed-in client who's between workspaces or whose org
  // metadata hasn't synced yet — in which case we just render generic chrome.
  const professional = await getProfessionalForClientPortal()
  const branding = (professional?.branding ?? null) as Branding | null
  const brandName = professional?.fullName ?? null
  const brandLogoUrl = branding?.logo_url ?? professional?.avatarUrl ?? null
  const style = brandingToStyle(branding)

  return (
    <div
      className="flex min-h-dvh w-full flex-col bg-background text-foreground"
      style={style}
    >
      <PortalHeader brandName={brandName} brandLogoUrl={brandLogoUrl} />

      <main className="flex flex-1 flex-col pb-16 md:pb-0">
        <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
          {children}
        </div>
      </main>

      <PortalMobileNav />
    </div>
  )
}

// Convert a professional's `branding` jsonb into a scoped style object. We
// only override the accent/ring tokens — text contrast, card surfaces, and
// destructive colours stay on the design-system defaults so the portal never
// becomes unreadable regardless of what colour the pro picked.
function brandingToStyle(branding: Branding | null): CSSProperties | undefined {
  if (!branding) return undefined
  const style: Record<string, string> = {}
  if (branding.primary_color) {
    style["--primary"] = branding.primary_color
    style["--ring"] = branding.primary_color
  }
  if (branding.secondary_color) {
    style["--accent"] = branding.secondary_color
  }
  if (branding.font) {
    style["--font-sans"] = branding.font
  }
  return Object.keys(style).length > 0 ? (style as CSSProperties) : undefined
}
