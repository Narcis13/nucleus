"use client"

import Link from "next/link"
import { useState } from "react"
import { useClerk } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Building, LogOut, Menu, Search, Settings, User } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { NotificationBell } from "@/components/shared/notifications/notification-bell"
import { useProfessional } from "@/hooks/use-professional"
import { getInitials } from "@/lib/utils"

import { Sidebar } from "./sidebar"

// ─────────────────────────────────────────────────────────────────────────────
// <Topbar>
//
// Desktop + mobile top bar. Shows the current professional's name/avatar
// (sourced from Clerk via useProfessional), a notification bell with a
// dropdown list, a lightweight org switcher, and a settings menu.
//
// On mobile the hamburger opens the full sidebar in a Sheet — the sidebar
// itself closes via the onNavigate callback when any nav item is clicked.
// ─────────────────────────────────────────────────────────────────────────────
export function Topbar({
  brandName,
  brandLogoUrl,
}: {
  brandName?: string | null
  brandLogoUrl?: string | null
}) {
  const { fullName, email, avatarUrl, plan } = useProfessional()
  const [sheetOpen, setSheetOpen] = useState(false)
  const { signOut } = useClerk()
  const router = useRouter()

  return (
    <header
      className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur supports-backdrop-filter:bg-background/60 sm:px-4"
    >
      {/* Mobile sidebar trigger */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
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
          <Sidebar
            variant="mobile"
            onNavigate={() => setSheetOpen(false)}
            brandName={brandName}
            brandLogoUrl={brandLogoUrl}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop search field — keeps the topbar from feeling empty. Wires up
          in a later session; keep the markup so the layout is already right. */}
      <div className="hidden min-w-0 flex-1 items-center md:flex">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search clients, invoices, forms…"
            aria-label="Search workspace"
            className="h-8 w-full rounded-md border border-border bg-muted/40 pr-2 pl-8 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            disabled
          />
        </div>
      </div>

      {/* Push right-side controls when search is hidden */}
      <div className="flex flex-1 md:hidden" />

      {/* Org switcher (lightweight placeholder until multi-org lands) */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="hidden max-w-[160px] items-center gap-1.5 text-muted-foreground sm:inline-flex"
            />
          }
        >
          <Building className="size-4" />
          <span className="truncate">{brandName || "Workspace"}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[200px]">
          <DropdownMenuLabel>Current workspace</DropdownMenuLabel>
          <DropdownMenuItem disabled>
            <Building className="size-4" />
            <span>{brandName || "Workspace"}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
            <Settings className="size-4" />
            Workspace settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Notifications */}
      <NotificationBell viewAllHref="/dashboard/notifications" />

      {/* Avatar / settings menu */}
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
            {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName ?? "User"} />}
            <AvatarFallback>{getInitials(fullName ?? email)}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[220px]">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="truncate text-sm font-medium text-foreground">
                {fullName || "Signed in"}
              </span>
              {email && (
                <span className="truncate text-xs text-muted-foreground">
                  {email}
                </span>
              )}
              <Badge
                variant="secondary"
                className="mt-1 w-fit text-[10px] capitalize"
              >
                {plan} plan
              </Badge>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
              <User className="size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/dashboard/settings/billing" />}>
              <Settings className="size-4" />
              Billing & plan
            </DropdownMenuItem>
          </DropdownMenuGroup>
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
    </header>
  )
}
