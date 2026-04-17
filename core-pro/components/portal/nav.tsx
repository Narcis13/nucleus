"use client"

import type { Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

import {
  PORTAL_NAV,
  PORTAL_NICHE_NAV,
  isPortalNavActive,
  type PortalNavItem,
} from "./nav-items"

// ─────────────────────────────────────────────────────────────────────────────
// <PortalNav>
//
// The portal's primary nav. Renders in two shapes:
//
//   • `horizontal` — the desktop top bar, sitting next to the brand mark.
//   • `vertical`   — the mobile hamburger drawer, stacked.
//
// Both shapes share the same item list and active-state logic so the niche
// extension slot and placeholder styling only need to be defined once.
// ─────────────────────────────────────────────────────────────────────────────

type PortalNavProps = {
  orientation?: "horizontal" | "vertical"
  className?: string
  onNavigate?: () => void
}

export function PortalNav({
  orientation = "horizontal",
  className,
  onNavigate,
}: PortalNavProps) {
  const pathname = usePathname() ?? ""
  const isVertical = orientation === "vertical"
  const t = useTranslations("portal.nav")

  const items = isVertical ? [...PORTAL_NAV, ...PORTAL_NICHE_NAV] : PORTAL_NAV

  return (
    <nav
      aria-label="Portal"
      className={cn(
        isVertical
          ? "flex flex-col gap-0.5"
          : "flex items-center gap-1",
        className,
      )}
    >
      {items.map((item) => (
        <PortalNavLink
          key={item.href}
          item={item}
          label={translateNav(t, item)}
          pathname={pathname}
          vertical={isVertical}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  )
}

// Resolve the nav label via translations, falling back to the item's baked-in
// English string when a niche fork introduces a key the bundle doesn't cover.
function translateNav(
  t: ReturnType<typeof useTranslations>,
  item: PortalNavItem,
): string {
  try {
    return t(item.labelKey)
  } catch {
    return item.fallbackLabel
  }
}

function PortalNavLink({
  item,
  label,
  pathname,
  vertical,
  onNavigate,
}: {
  item: PortalNavItem
  label: string
  pathname: string
  vertical: boolean
  onNavigate?: () => void
}) {
  const active = !item.placeholder && isPortalNavActive(pathname, item.href)
  const Icon = item.icon

  const base = vertical
    ? "group relative flex h-9 items-center gap-2.5 rounded-md px-2 text-sm font-medium transition-colors"
    : "group relative flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors"

  const state = item.placeholder
    ? "cursor-default text-muted-foreground/60"
    : active
      ? "bg-primary/10 text-primary"
      : "text-muted-foreground hover:bg-muted hover:text-foreground"

  const content = (
    <>
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className={cn("truncate", !vertical && "hidden lg:inline")}>
        {label}
      </span>
    </>
  )

  if (item.placeholder) {
    return (
      <span className={cn(base, state)} aria-disabled="true">
        {content}
      </span>
    )
  }

  return (
    <Link
      href={item.href as Route}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(base, state)}
    >
      {content}
      {/* Desktop active underline — subtle, avoids competing with the pill bg. */}
      {!vertical && active && (
        <span
          aria-hidden
          className="absolute inset-x-2 -bottom-[9px] h-0.5 rounded-full bg-primary"
        />
      )}
    </Link>
  )
}
