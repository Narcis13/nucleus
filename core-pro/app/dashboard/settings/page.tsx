import type { Route } from "next"
import Link from "next/link"
import { Bell, Building, CreditCard, Palette, Plug, User } from "lucide-react"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"

// Grouped settings landing — each card links to (or will link to) a dedicated
// settings subpage. Only billing is live today; the rest are placeholders so
// the information architecture is visible end-to-end.
const SETTINGS_GROUPS: Array<{
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  enabled?: boolean
}> = [
  {
    title: "Profile",
    description: "Your name, avatar, bio, and contact details.",
    href: "/dashboard/settings",
    icon: User,
  },
  {
    title: "Workspace",
    description: "Business name, timezone, locale, and currency.",
    href: "/dashboard/settings",
    icon: Building,
  },
  {
    title: "Billing & plan",
    description: "Manage your subscription, payment method, and invoices.",
    href: "/dashboard/settings/billing",
    icon: CreditCard,
    enabled: true,
  },
  {
    title: "Notifications",
    description: "Pick what pings you — per type, per channel, with quiet hours.",
    href: "/dashboard/settings/notifications",
    icon: Bell,
    enabled: true,
  },
  {
    title: "Branding",
    description: "Colours, logo, and fonts for your portal and site.",
    href: "/dashboard/settings",
    icon: Palette,
  },
  {
    title: "Integrations",
    description: "Calendar, email, and third-party connections.",
    href: "/dashboard/settings",
    icon: Plug,
  },
]

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Configure your profile, workspace, billing, and branding."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SETTINGS_GROUPS.map((group) => {
          const Icon = group.icon
          const content = (
            <Card className="h-full transition-colors hover:border-ring">
              <CardHeader>
                <div className="mb-2 flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="size-4" />
                </div>
                <CardTitle className="text-base">{group.title}</CardTitle>
                <CardDescription>{group.description}</CardDescription>
              </CardHeader>
            </Card>
          )
          return group.enabled ? (
            <Link key={group.title} href={group.href as Route} className="block">
              {content}
            </Link>
          ) : (
            <div key={group.title} aria-disabled className="block opacity-60">
              {content}
            </div>
          )
        })}
      </div>
    </div>
  )
}
