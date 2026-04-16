"use client"

import { Bell } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNotifications } from "@/hooks/use-notifications"
import { cn } from "@/lib/utils"

import { NotificationDropdown } from "./notification-dropdown"

// ─────────────────────────────────────────────────────────────────────────────
// <NotificationBell>
//
// Bell icon with an unread dot; click opens a dropdown listing recent
// notifications. A single `useNotifications` call lives here so the bell and
// the dropdown share one realtime channel (avoids two subscriptions per
// render) — the list + handlers are threaded down as props.
// ─────────────────────────────────────────────────────────────────────────────
export function NotificationBell({
  align = "end",
  className,
  // The list page href is consumer-specific: dashboard users go to
  // /dashboard/notifications, portal clients have a lighter affordance. Keep
  // the URL resolution outside this component.
  viewAllHref,
}: {
  align?: "start" | "center" | "end"
  className?: string
  viewAllHref?: string
}) {
  const { notifications, unreadCount, markAsRead, markAllRead } =
    useNotifications({ limit: 15 })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn("relative", className)}
            aria-label={
              unreadCount > 0
                ? `Notifications — ${unreadCount} unread`
                : "Notifications"
            }
          />
        }
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span
            aria-hidden
            className="absolute top-1 right-1 size-2 rounded-full bg-primary ring-2 ring-background"
          />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-80 max-w-[90vw] p-0">
        <NotificationDropdown
          items={notifications}
          unreadCount={unreadCount}
          onMarkRead={markAsRead}
          onMarkAllRead={markAllRead}
          viewAllHref={viewAllHref}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
