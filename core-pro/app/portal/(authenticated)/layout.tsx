import type { CSSProperties } from "react"

import { PortalHeader } from "@/components/portal/header"
import { PortalMobileNav } from "@/components/portal/mobile-nav"
import { getPortalClientIdentity } from "@/lib/db/queries/portal"
import { getPortalProfessionalById } from "@/lib/db/queries/professionals"
import { requirePortalSession } from "@/lib/portal-auth/session"
import { PortalSupabaseAuthProvider } from "@/lib/supabase/portal-context"
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
// Auth: the layout is the trust boundary for the portal — `requirePortalSession`
// reads the `nucleus_portal` cookie, validates the HMAC, looks up the session
// row, and redirects to `/portal/sign-in` if anything is off.
// ─────────────────────────────────────────────────────────────────────────────
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requirePortalSession()

  // Branding lookup off the resolved professional. Falls back to generic chrome
  // if the row is missing (defensive — shouldn't happen because the session
  // join already filtered to an active professional).
  const [professional, clientIdentity] = await Promise.all([
    getPortalProfessionalById(session.professionalId),
    getPortalClientIdentity(session.clientId),
  ])
  const branding = (professional?.branding ?? null) as Branding | null
  const brandName = professional?.fullName ?? null
  const brandLogoUrl = branding?.logo_url ?? professional?.avatarUrl ?? null
  const style = brandingToStyle(branding)

  return (
    <PortalSupabaseAuthProvider>
      <div
        className="flex min-h-dvh w-full flex-col bg-background text-foreground"
        style={style}
      >
        <PortalHeader
          brandName={brandName}
          brandLogoUrl={brandLogoUrl}
          clientName={clientIdentity?.fullName ?? null}
          clientEmail={clientIdentity?.email ?? null}
          clientAvatarUrl={clientIdentity?.avatarUrl ?? null}
        />

        <main className="flex flex-1 flex-col pb-16 md:pb-0">
          <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
            {children}
          </div>
        </main>

        <PortalMobileNav />
      </div>
    </PortalSupabaseAuthProvider>
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
