"use client"

import type { Route } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import type { NotificationItem } from "@/hooks/use-notifications"
import { cn, formatDateTime } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// <NotificationDropdown>
//
// Presentational body of the bell popover: header + list + footer link to the
// full history page. Takes all data as props (owned by <NotificationBell>) so
// we don't open a second realtime channel per instance.
// ─────────────────────────────────────────────────────────────────────────────
export function NotificationDropdown({
  items,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  viewAllHref,
}: {
  items: NotificationItem[]
  unreadCount: number
  onMarkRead: (id: string) => Promise<void> | void
  onMarkAllRead: () => Promise<void> | void
  viewAllHref?: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-sm font-semibold">Notifications</span>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="xs"
            className="h-6 text-xs"
            onClick={() => {
              void onMarkAllRead()
            }}
          >
            Mark all read
          </Button>
        )}
      </div>
      <DropdownMenuSeparator />
      {items.length === 0 ? (
        <div className="px-3 py-6 text-center text-sm text-muted-foreground">
          You&apos;re all caught up.
        </div>
      ) : (
        <ul className="max-h-80 overflow-y-auto">
          {items.slice(0, 8).map((n) => (
            <NotificationRow key={n.id} item={n} onMarkRead={onMarkRead} />
          ))}
        </ul>
      )}
      {viewAllHref && (
        <>
          <DropdownMenuSeparator />
          <div className="px-2 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              render={<Link href={viewAllHref as Route} />}
            >
              View all notifications
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function NotificationRow({
  item,
  onMarkRead,
}: {
  item: NotificationItem
  onMarkRead: (id: string) => Promise<void> | void
}) {
  const body = (
    <div>
      <div className="font-medium">{item.title}</div>
      {item.body && (
        <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {item.body}
        </div>
      )}
      <div className="mt-1 text-[11px] text-muted-foreground">
        {formatDateTime(item.createdAt)}
      </div>
    </div>
  )

  const className = cn(
    "block px-3 py-2 text-sm transition-colors hover:bg-muted",
    !item.readAt && "bg-muted/40",
  )

  if (item.href) {
    return (
      <li>
        <Link
          href={item.href as Route}
          className={className}
          onClick={() => {
            if (!item.readAt) void onMarkRead(item.id)
          }}
        >
          {body}
        </Link>
      </li>
    )
  }

  return (
    <li>
      <button
        type="button"
        className={cn(className, "w-full text-left")}
        onClick={() => {
          if (!item.readAt) void onMarkRead(item.id)
        }}
      >
        {body}
      </button>
    </li>
  )
}
