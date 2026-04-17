"use client"

import type { Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useState, type ReactNode } from "react"
import { ChevronsLeft, ChevronsRight } from "lucide-react"
import { useTranslations } from "next-intl"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useUnreadMessages } from "@/hooks/use-unread-messages"
import { cn } from "@/lib/utils"

import {
  NICHE_NAV,
  PRIMARY_NAV,
  SETTINGS_NAV,
  isNavActive,
  type NavItem,
} from "./nav-items"

// ─────────────────────────────────────────────────────────────────────────────
// <Sidebar>
//
// Desktop sidebar with a collapsible rail. Collapsed state is persisted to a
// cookie so SSR can render the correct width on the next visit — the layout
// reads the cookie and passes the initial value here.
//
// The mobile variant (sheet) renders the same item list but forces
// `collapsed=false` and exposes an `onNavigate` callback so the sheet can be
// dismissed automatically after the user picks a destination.
// ─────────────────────────────────────────────────────────────────────────────

const COLLAPSE_COOKIE = "dashboard:sidebar-collapsed"

function writeCollapseCookie(collapsed: boolean) {
  if (typeof document === "undefined") return
  // 180 days is plenty — if the cookie goes away we just fall back to expanded.
  const maxAge = 60 * 60 * 24 * 180
  document.cookie = `${COLLAPSE_COOKIE}=${collapsed ? "1" : "0"}; path=/; max-age=${maxAge}; SameSite=Lax`
}

type SidebarProps = {
  initialCollapsed?: boolean
  variant?: "desktop" | "mobile"
  onNavigate?: () => void
  brandName?: string | null
  brandLogoUrl?: string | null
}

export function Sidebar({
  initialCollapsed = false,
  variant = "desktop",
  onNavigate,
  brandName,
  brandLogoUrl,
}: SidebarProps) {
  const isMobile = variant === "mobile"
  const [collapsed, setCollapsed] = useState<boolean>(
    isMobile ? false : initialCollapsed
  )

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      writeCollapseCookie(next)
      return next
    })
  }, [])

  return (
    <TooltipProvider delay={200}>
      <aside
        data-collapsed={collapsed}
        className={cn(
          "flex h-full flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out",
          isMobile
            ? "w-full border-r-0"
            : collapsed
              ? "w-[64px]"
              : "w-[240px]"
        )}
      >
        <SidebarBrand
          collapsed={collapsed}
          brandName={brandName}
          brandLogoUrl={brandLogoUrl}
        />
        <Separator />

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <ul className="flex flex-col gap-0.5">
            {PRIMARY_NAV.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ))}
          </ul>

          <SidebarSectionLabel collapsed={collapsed}>Niche</SidebarSectionLabel>
          <ul className="flex flex-col gap-0.5">
            {NICHE_NAV.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </nav>

        <Separator />
        <div className="flex flex-col gap-1 px-2 py-3">
          <SidebarLink
            item={SETTINGS_NAV}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggle}
              className="mt-1 justify-center text-muted-foreground"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronsRight className="size-4" />
              ) : (
                <>
                  <ChevronsLeft className="size-4" />
                  <span>Collapse</span>
                </>
              )}
            </Button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}

function SidebarBrand({
  collapsed,
  brandName,
  brandLogoUrl,
}: {
  collapsed: boolean
  brandName?: string | null
  brandLogoUrl?: string | null
}) {
  const label = brandName?.trim() || "CorePro"
  const initials = label.slice(0, 2).toUpperCase()
  return (
    <div
      className={cn(
        "flex h-14 items-center gap-2 px-3",
        collapsed && "justify-center px-0"
      )}
    >
      <Link
        href="/dashboard"
        className="flex items-center gap-2 font-heading text-sm font-semibold text-foreground"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          {brandLogoUrl ? (
            // Logos are tiny square marks — keep it simple, don't use next/image
            // here because the URL can be arbitrary (user-supplied) and we'd
            // need remotePatterns for every professional's domain.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brandLogoUrl}
              alt=""
              className="size-full rounded-md object-cover"
            />
          ) : (
            <span className="text-xs font-semibold">{initials}</span>
          )}
        </span>
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
    </div>
  )
}

function SidebarSectionLabel({
  collapsed,
  children,
}: {
  collapsed: boolean
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "mt-4 mb-1 flex items-center",
        collapsed ? "justify-center" : "px-1.5"
      )}
    >
      {collapsed ? (
        <Separator className="w-6" />
      ) : (
        <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          {children}
        </span>
      )}
    </div>
  )
}

function SidebarLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname() ?? ""
  const active = !item.placeholder && isNavActive(pathname, item.href)
  const Icon = item.icon
  const t = useTranslations("dashboard.nav")
  let label = item.fallbackLabel
  try {
    label = t(item.labelKey)
  } catch {
    /* untranslated niche key — keep the fallback */
  }

  const content = (
    <>
      <Icon
        className={cn(
          "size-4 shrink-0",
          active ? "text-sidebar-accent-foreground" : "text-muted-foreground group-hover:text-sidebar-accent-foreground"
        )}
        aria-hidden
      />
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && item.badgeKey && <NavBadge badgeKey={item.badgeKey} />}
      {collapsed && item.badgeKey && (
        <NavBadge badgeKey={item.badgeKey} collapsedDot />
      )}
    </>
  )

  const baseClass = cn(
    "group relative flex h-9 items-center gap-2.5 rounded-md px-2 text-sm font-medium transition-colors",
    collapsed && "justify-center px-0",
    item.placeholder
      ? "cursor-default text-muted-foreground/60"
      : active
        ? "bg-sidebar-accent text-sidebar-accent-foreground"
        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
  )

  const link = item.placeholder ? (
    <span className={baseClass} aria-disabled="true">
      {content}
    </span>
  ) : (
    <Link
      href={item.href as Route}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={baseClass}
    >
      {content}
    </Link>
  )

  if (!collapsed) return <li>{link}</li>

  return (
    <li>
      <Tooltip>
        <TooltipTrigger render={link} />
        <TooltipContent side="right" sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    </li>
  )
}

function NavBadge({
  badgeKey,
  collapsedDot,
}: {
  badgeKey: NonNullable<NavItem["badgeKey"]>
  collapsedDot?: boolean
}) {
  const unreadCount = useUnreadMessages()
  if (badgeKey !== "unread_messages" || unreadCount <= 0) return null
  if (collapsedDot) {
    return (
      <span
        aria-label={`${unreadCount} unread`}
        className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary"
      />
    )
  }
  return (
    <Badge
      variant="default"
      className="ml-auto h-4 min-w-[1.1rem] px-1 text-[10px]"
    >
      {unreadCount > 99 ? "99+" : unreadCount}
    </Badge>
  )
}
