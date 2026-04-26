"use client"

import Link from "next/link"
import { LogOut, Menu, User } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useTranslations } from "next-intl"
import { useState } from "react"

import { signOutPortalAction } from "@/app/portal/(authenticated)/actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { LocaleSwitcher } from "@/components/shared/i18n/locale-switcher"
import { NotificationBell } from "@/components/shared/notifications/notification-bell"
import { cn, getInitials } from "@/lib/utils"

import { PortalNav } from "./nav"

// ─────────────────────────────────────────────────────────────────────────────
// <PortalHeader>
//
// Branded top bar for the client portal:
//   • Left: hamburger (mobile only) + professional's logo/name linking home.
//   • Middle (desktop ≥ md): horizontal primary nav.
//   • Right: the client's avatar with an account dropdown (sign out).
//
// Identity comes from the server layout — it resolves the portal session,
// loads the professional's branding + the client's profile, and threads
// everything as props. No Clerk hooks here; the trust boundary is the
// `nucleus_portal` cookie validated server-side.
// ─────────────────────────────────────────────────────────────────────────────

export function PortalHeader({
  brandName,
  brandLogoUrl,
  clientName,
  clientEmail,
  clientAvatarUrl,
}: {
  brandName?: string | null
  brandLogoUrl?: string | null
  clientName?: string | null
  clientEmail?: string | null
  clientAvatarUrl?: string | null
}) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const t = useTranslations("portal.header")
  const { execute: signOut, isExecuting } = useAction(signOutPortalAction)

  const label = brandName?.trim() || t("defaultWorkspace")
  const initials = label.slice(0, 2).toUpperCase()
  const accountFallback = getInitials(clientName ?? clientEmail ?? "?")

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4 sm:px-6">
        {/* Mobile drawer with the full nav (incl. niche placeholder). */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="md:hidden"
                aria-label="Open navigation"
              />
            }
          >
            <Menu />
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[260px] p-0 sm:max-w-[260px]"
            showCloseButton={false}
          >
            <div className="flex h-14 items-center gap-2 border-b border-border px-4">
              <BrandMark label={label} initials={initials} logoUrl={brandLogoUrl} />
              <span className="truncate font-heading text-sm font-semibold text-foreground">
                {label}
              </span>
            </div>
            <div className="p-2">
              <PortalNav
                orientation="vertical"
                onNavigate={() => setSheetOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>

        <Link
          href="/portal"
          className="flex min-w-0 items-center gap-2 font-heading text-sm font-semibold text-foreground"
        >
          <BrandMark label={label} initials={initials} logoUrl={brandLogoUrl} />
          <span className="truncate">{label}</span>
        </Link>

        <PortalNav
          orientation="horizontal"
          className="ml-4 hidden md:flex"
        />

        <div className="flex flex-1 items-center justify-end gap-1">
          <LocaleSwitcher variant="compact" />
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  aria-label={t("accountMenu")}
                />
              }
            >
              <Avatar size="sm">
                {clientAvatarUrl && (
                  <AvatarImage
                    src={clientAvatarUrl}
                    alt={clientName ?? "Client"}
                  />
                )}
                <AvatarFallback>{accountFallback}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[220px]">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="truncate text-sm font-medium text-foreground">
                    {clientName || t("signedIn")}
                  </span>
                  {clientEmail && (
                    <span className="truncate text-xs text-muted-foreground">
                      {clientEmail}
                    </span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <User className="size-4" />
                {t("profile")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={isExecuting}
                onClick={() => {
                  signOut({})
                }}
              >
                <LogOut className="size-4" />
                {t("signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

function BrandMark({
  label,
  initials,
  logoUrl,
}: {
  label: string
  initials: string
  logoUrl?: string | null
}) {
  return (
    <span
      aria-label={label}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary text-primary-foreground",
      )}
    >
      {logoUrl ? (
        // User-supplied logo URLs — skip next/image so we don't need a
        // `remotePatterns` entry for every professional's CDN.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="size-full object-cover" />
      ) : (
        <span className="text-xs font-semibold">{initials}</span>
      )}
    </span>
  )
}
