import type { Route } from "next"
import {
  BarChart3,
  Briefcase,
  Calendar,
  FileText,
  FolderOpen,
  Globe,
  Home,
  Megaphone,
  MessageCircle,
  Receipt,
  Settings,
  Sparkles,
  Target,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  // Key under `dashboard.nav.*` in the messages bundles. The nav components
  // resolve it at render time so the sidebar relabels itself on locale switch.
  labelKey: string
  // Baked-in English fallback used when a niche fork ships an untranslated key.
  fallbackLabel: string
  // `Route` rather than raw `string` so these stay compatible with Next 16's
  // typedRoutes — each literal below is validated against the generated
  // AppRoutes union at build time.
  href: Route
  icon: LucideIcon
  badgeKey?: "unread_messages"
  // Placeholder items are shown greyed out without a link — used for the
  // niche extension slot in the boilerplate. A niche fork flips this to a
  // real href and drops in its own page.
  placeholder?: boolean
}

// Primary sidebar items, in display order. `Settings` is pinned to the bottom
// of the sidebar separately so it's not included here.
export const PRIMARY_NAV: NavItem[] = [
  { labelKey: "home", fallbackLabel: "Dashboard", href: "/dashboard", icon: Home },
  { labelKey: "clients", fallbackLabel: "Clients", href: "/dashboard/clients", icon: Users },
  { labelKey: "leads", fallbackLabel: "Leads", href: "/dashboard/leads", icon: Target },
  { labelKey: "services", fallbackLabel: "Services", href: "/dashboard/services", icon: Briefcase },
  { labelKey: "calendar", fallbackLabel: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  {
    labelKey: "messages",
    fallbackLabel: "Messages",
    href: "/dashboard/messages",
    icon: MessageCircle,
    badgeKey: "unread_messages",
  },
  { labelKey: "forms", fallbackLabel: "Forms", href: "/dashboard/forms", icon: FileText },
  { labelKey: "documents", fallbackLabel: "Documents", href: "/dashboard/documents", icon: FolderOpen },
  { labelKey: "invoices", fallbackLabel: "Invoices", href: "/dashboard/invoices", icon: Receipt },
  { labelKey: "automations", fallbackLabel: "Automations", href: "/dashboard/automations", icon: Zap },
  { labelKey: "marketing", fallbackLabel: "Marketing", href: "/dashboard/marketing", icon: Megaphone },
  { labelKey: "analytics", fallbackLabel: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { labelKey: "siteBuilder", fallbackLabel: "Site Builder", href: "/dashboard/site-builder", icon: Globe },
]

// Niche extension items. The boilerplate ships with a single placeholder so
// the section divider is visible; a specialized app replaces this list with
// real routes.
export const NICHE_NAV: NavItem[] = [
  {
    labelKey: "niche",
    fallbackLabel: "Niche module",
    href: "#",
    icon: Sparkles,
    placeholder: true,
  },
]

export const SETTINGS_NAV: NavItem = {
  labelKey: "settings",
  fallbackLabel: "Settings",
  href: "/dashboard/settings",
  icon: Settings,
}

// Subset pinned to the mobile bottom tab bar. Kept short so labels fit.
export const MOBILE_BOTTOM_NAV: NavItem[] = [
  { labelKey: "home", fallbackLabel: "Home", href: "/dashboard", icon: Home },
  { labelKey: "clients", fallbackLabel: "Clients", href: "/dashboard/clients", icon: Users },
  { labelKey: "calendar", fallbackLabel: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  {
    labelKey: "messages",
    fallbackLabel: "Messages",
    href: "/dashboard/messages",
    icon: MessageCircle,
    badgeKey: "unread_messages",
  },
  { labelKey: "settings", fallbackLabel: "Settings", href: "/dashboard/settings", icon: Settings },
]

// Active-path matcher shared by desktop + mobile nav. `/dashboard` should only
// be "active" for the exact route, otherwise every child page would light it
// up as well.
export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard"
  return pathname === href || pathname.startsWith(`${href}/`)
}
