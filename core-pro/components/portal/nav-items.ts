import type { Route } from "next"
import {
  FileText,
  FolderOpen,
  Home,
  MessageCircle,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"

// ─────────────────────────────────────────────────────────────────────────────
// Client portal nav items.
//
// Mirrors the dashboard's item model so the visual language stays consistent
// across the two shells, but intentionally lives in its own file — the portal
// audience (clients) is different from the dashboard audience (professionals),
// so items will drift over time and we don't want tight coupling.
// ─────────────────────────────────────────────────────────────────────────────

export type PortalNavItem = {
  label: string
  // Typed against Next's generated `AppRoutes` union (next.config.ts has
  // `typedRoutes: true`), so an invalid path would fail the build here.
  href: Route
  icon: LucideIcon
  placeholder?: boolean
}

export const PORTAL_NAV: PortalNavItem[] = [
  { label: "Dashboard", href: "/portal", icon: Home },
  { label: "Messages", href: "/portal/messages", icon: MessageCircle },
  { label: "Documents", href: "/portal/documents", icon: FolderOpen },
  { label: "Forms", href: "/portal/forms", icon: FileText },
  { label: "Progress", href: "/portal/progress", icon: TrendingUp },
]

// Niche extension slot — shown greyed-out until a specialized fork drops in a
// real page and flips `placeholder` off.
export const PORTAL_NICHE_NAV: PortalNavItem[] = [
  {
    label: "Niche section",
    href: "#" as Route,
    icon: Sparkles,
    placeholder: true,
  },
]

// A compact subset pinned to the mobile bottom tab bar. We drop the niche
// placeholder here so thumb-nav stays focused on the shipping features.
export const PORTAL_MOBILE_NAV: PortalNavItem[] = PORTAL_NAV

export function isPortalNavActive(pathname: string, href: string): boolean {
  if (href === "/portal") return pathname === "/portal"
  return pathname === href || pathname.startsWith(`${href}/`)
}
