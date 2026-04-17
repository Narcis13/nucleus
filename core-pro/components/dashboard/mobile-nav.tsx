"use client"

import type { Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"

import { useUnreadMessages } from "@/hooks/use-unread-messages"
import { cn } from "@/lib/utils"

import { MOBILE_BOTTOM_NAV, isNavActive } from "./nav-items"

// ─────────────────────────────────────────────────────────────────────────────
// <MobileNav>
//
// Fixed bottom tab bar for mobile. Complements the hamburger sheet in the
// topbar — the sheet gives the full menu while this bar surfaces the 5 most
// common destinations for one-thumb navigation.
//
// Only rendered below `lg`; the layout also adds bottom padding on mobile so
// the last-row content isn't covered by this bar.
// ─────────────────────────────────────────────────────────────────────────────
export function MobileNav() {
  const pathname = usePathname() ?? ""
  const unreadCount = useUnreadMessages()
  const t = useTranslations("dashboard.nav")

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {MOBILE_BOTTOM_NAV.map((item) => {
        const Icon = item.icon
        const active = isNavActive(pathname, item.href)
        const showBadge = item.badgeKey === "unread_messages" && unreadCount > 0
        let label = item.fallbackLabel
        try {
          label = t(item.labelKey)
        } catch {
          /* untranslated niche key — keep the fallback */
        }
        return (
          <Link
            key={item.href}
            href={item.href as Route}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="relative">
              <Icon className="size-5" aria-hidden />
              {showBadge && (
                <span
                  aria-hidden
                  className="absolute -top-1 -right-1 size-2 rounded-full bg-primary ring-2 ring-background"
                />
              )}
            </span>
            <span>{label}</span>
            {active && (
              <span
                aria-hidden
                className="absolute top-0 h-0.5 w-8 rounded-b-full bg-primary"
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
