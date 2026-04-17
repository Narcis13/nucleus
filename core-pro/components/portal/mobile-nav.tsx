"use client"

import type { Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

import { PORTAL_MOBILE_NAV, isPortalNavActive } from "./nav-items"

// ─────────────────────────────────────────────────────────────────────────────
// <PortalMobileNav>
//
// Fixed bottom tab bar for the client portal on small screens. Complements
// the hamburger drawer in the header — the drawer surfaces the full nav list
// (including the niche placeholder), while this bar keeps the core 5
// destinations one-thumb away.
//
// Only rendered below `md`; the layout adds bottom padding on mobile so the
// last row of page content isn't hidden under the bar.
// ─────────────────────────────────────────────────────────────────────────────

export function PortalMobileNav() {
  const pathname = usePathname() ?? ""
  const t = useTranslations("portal.nav")

  return (
    <nav
      aria-label="Portal"
      className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {PORTAL_MOBILE_NAV.map((item) => {
        const Icon = item.icon
        const active = isPortalNavActive(pathname, item.href)
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
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden />
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
