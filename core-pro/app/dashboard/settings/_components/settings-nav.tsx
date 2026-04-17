"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { Route } from "next"
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CreditCard,
  Palette,
  Plug,
  Shield,
  User,
  Users,
} from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { cn } from "@/lib/utils"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

// Typed-routes disagrees with us on brand-new segments the build hasn't seen
// yet; cast at the Link site instead of pretending these aren't `string`s.
const ITEMS: readonly NavItem[] = [
  { href: "/dashboard/settings/profile", label: "Profile", icon: User },
  { href: "/dashboard/settings/branding", label: "Branding", icon: Palette },
  { href: "/dashboard/settings/billing", label: "Billing", icon: CreditCard },
  {
    href: "/dashboard/settings/notifications",
    label: "Notifications",
    icon: Bell,
  },
  {
    href: "/dashboard/settings/calendar",
    label: "Calendar",
    icon: CalendarClock,
  },
  {
    href: "/dashboard/settings/integrations",
    label: "Integrations",
    icon: Plug,
  },
  { href: "/dashboard/settings/team", label: "Team", icon: Users },
  { href: "/dashboard/settings/gdpr", label: "GDPR", icon: Shield },
  {
    href: "/dashboard/settings/danger",
    label: "Danger zone",
    icon: AlertTriangle,
  },
] as const

export function SettingsNav() {
  const pathname = usePathname()
  return (
    <>
      <PageHeader
        title="Settings"
        description="Profile, branding, billing, notifications, integrations, team, and privacy."
      />
      <nav className="-mx-1 flex flex-wrap gap-1 overflow-x-auto">
        {ITEMS.map((item) => {
          const Icon = item.icon
          // Prefix match so nested sub-paths (e.g. a future
          // /dashboard/settings/profile/edit) still highlight the parent tab.
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href as Route}
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors",
                active
                  ? "border-ring bg-muted text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                item.href === "/dashboard/settings/danger" &&
                  !active &&
                  "text-destructive/80 hover:text-destructive",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
