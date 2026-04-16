"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useClerk } from "@clerk/nextjs"
import { LogOut, Menu, User } from "lucide-react"
import { useState } from "react"

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
import { NotificationBell } from "@/components/shared/notifications/notification-bell"
import { usePortalContext } from "@/hooks/use-portal-context"
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
// Branding values come from the layout's server render (so colours and logo
// paint on the first HTML, not after a client hydration hop). The client's
// own identity comes from `usePortalContext` via Clerk.
// ─────────────────────────────────────────────────────────────────────────────

export function PortalHeader({
  brandName,
  brandLogoUrl,
}: {
  brandName?: string | null
  brandLogoUrl?: string | null
}) {
  const { client } = usePortalContext()
  const { signOut } = useClerk()
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)

  const label = brandName?.trim() || "Your workspace"
  const initials = label.slice(0, 2).toUpperCase()

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
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  aria-label="Account menu"
                />
              }
            >
              <Avatar size="sm">
                {client.avatarUrl && (
                  <AvatarImage
                    src={client.avatarUrl}
                    alt={client.fullName ?? "Client"}
                  />
                )}
                <AvatarFallback>
                  {getInitials(client.fullName ?? client.email)}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[220px]">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="truncate text-sm font-medium text-foreground">
                    {client.fullName || "Signed in"}
                  </span>
                  {client.email && (
                    <span className="truncate text-xs text-muted-foreground">
                      {client.email}
                    </span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <User className="size-4" />
                Profile (soon)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  void signOut(() => router.push("/"))
                }}
              >
                <LogOut className="size-4" />
                Sign out
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
