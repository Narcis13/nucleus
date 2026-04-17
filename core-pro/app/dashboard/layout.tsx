import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { CSSProperties } from "react"

import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Topbar } from "@/components/dashboard/topbar"
import { getCurrentClerkUserId } from "@/lib/clerk/helpers"
import { getProfessional } from "@/lib/db/queries/professionals"
import { syncLocaleFromDb } from "@/lib/i18n/locale"
import type { Branding } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard layout
//
// Composes the whole authenticated shell:
//   • Left sidebar (desktop), mobile hamburger opens it in a Sheet
//   • Sticky topbar with search, org switcher, notifications, avatar menu
//   • Breadcrumbs strip under the topbar
//   • Main scroll area for the current segment
//   • Bottom mobile tab bar
//
// Branding: every professional can override `--primary` + `--ring` via their
// `branding.primary_color` setting. We apply those to a scoped wrapper using
// inline CSS variables — downstream components read `var(--primary)` and
// automatically pick up the override without knowing the professional exists.
// ─────────────────────────────────────────────────────────────────────────────
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Gate access upfront — prevents a flash of chrome before Clerk's middleware
  // would otherwise redirect us. The dashboard is strictly authenticated.
  const clerkUserId = await getCurrentClerkUserId()
  if (!clerkUserId) {
    redirect("/sign-in?redirect_url=/dashboard")
  }

  const [professional, cookieStore] = await Promise.all([
    getProfessional(),
    cookies(),
  ])

  // First-login locale bootstrap — on subsequent visits the cookie is already
  // set so this is a no-op. The switcher in Settings overwrites either way.
  await syncLocaleFromDb(professional?.locale ?? null)

  const collapsed =
    cookieStore.get("dashboard:sidebar-collapsed")?.value === "1"
  const branding = (professional?.branding ?? null) as Branding | null
  const brandName = professional?.fullName ?? null
  const brandLogoUrl = branding?.logo_url ?? null
  const style = brandingToStyle(branding)

  return (
    <div
      className="flex min-h-dvh w-full bg-background text-foreground"
      style={style}
    >
      {/* Desktop sidebar */}
      <div className="sticky top-0 hidden h-dvh shrink-0 lg:block">
        <Sidebar
          initialCollapsed={collapsed}
          brandName={brandName}
          brandLogoUrl={brandLogoUrl}
        />
      </div>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar brandName={brandName} brandLogoUrl={brandLogoUrl} />

        <main className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">
          <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 sm:px-6 sm:py-6">
            <Breadcrumbs className="mb-3" />
            {children}
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  )
}

// Convert a professional's `branding` jsonb into a scoped style object. We
// only override the accent/ring tokens — the rest of the design system stays
// intact so text contrast, card surfaces, and destructive states all remain
// consistent regardless of what colour the pro picked.
function brandingToStyle(branding: Branding | null): CSSProperties | undefined {
  if (!branding) return undefined
  const style: Record<string, string> = {}
  if (branding.primary_color) {
    style["--primary"] = branding.primary_color
    style["--ring"] = branding.primary_color
    style["--sidebar-primary"] = branding.primary_color
  }
  if (branding.secondary_color) {
    style["--accent"] = branding.secondary_color
  }
  if (branding.font) {
    style["--font-sans"] = branding.font
  }
  return Object.keys(style).length > 0 ? (style as CSSProperties) : undefined
}
