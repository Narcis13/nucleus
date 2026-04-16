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
  label: string
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
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Clients", href: "/dashboard/clients", icon: Users },
  { label: "Leads", href: "/dashboard/leads", icon: Target },
  { label: "Services", href: "/dashboard/services", icon: Briefcase },
  { label: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  {
    label: "Messages",
    href: "/dashboard/messages",
    icon: MessageCircle,
    badgeKey: "unread_messages",
  },
  { label: "Forms", href: "/dashboard/forms", icon: FileText },
  { label: "Documents", href: "/dashboard/documents", icon: FolderOpen },
  { label: "Invoices", href: "/dashboard/invoices", icon: Receipt },
  { label: "Automations", href: "/dashboard/automations", icon: Zap },
  { label: "Marketing", href: "/dashboard/marketing", icon: Megaphone },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Site Builder", href: "/dashboard/site-builder", icon: Globe },
]

// Niche extension items. The boilerplate ships with a single placeholder so
// the section divider is visible; a specialized app replaces this list with
// real routes.
export const NICHE_NAV: NavItem[] = [
  {
    label: "Niche module",
    href: "#",
    icon: Sparkles,
    placeholder: true,
  },
]

export const SETTINGS_NAV: NavItem = {
  label: "Settings",
  href: "/dashboard/settings",
  icon: Settings,
}

// Subset pinned to the mobile bottom tab bar. Kept short so labels fit.
export const MOBILE_BOTTOM_NAV: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Clients", href: "/dashboard/clients", icon: Users },
  { label: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  {
    label: "Messages",
    href: "/dashboard/messages",
    icon: MessageCircle,
    badgeKey: "unread_messages",
  },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
]

// Active-path matcher shared by desktop + mobile nav. `/dashboard` should only
// be "active" for the exact route, otherwise every child page would light it
// up as well.
export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard"
  return pathname === href || pathname.startsWith(`${href}/`)
}
