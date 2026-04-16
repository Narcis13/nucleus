"use client"

import type { Route } from "next"
import Link from "next/link"
import { Bell, CircleCheckBig } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/page-header"
import {
  type NotificationItem,
  useNotifications,
} from "@/hooks/use-notifications"
import { cn, formatDateTime } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// <NotificationsList>
//
// Full history view for /dashboard/notifications and /portal/notifications.
// Groups items by read/unread so the user can scan "what's new" at the top
// without the noise of old acknowledged rows. Each row behaves like the
// dropdown: clicking a link-bearing item marks it read and navigates.
// ─────────────────────────────────────────────────────────────────────────────
export function NotificationsList() {
  const { isLoaded, notifications, unreadCount, markAsRead, markAllRead } =
    useNotifications({ limit: 200 })

  if (!isLoaded) {
    return (
      <ul className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <li
            key={i}
            className="h-16 animate-pulse rounded-lg bg-muted/60"
            aria-hidden
          />
        ))}
      </ul>
    )
  }

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={<Bell />}
        title="No notifications yet"
        description="You'll see updates here about messages, appointments, forms, and more."
      />
    )
  }

  const unread = notifications.filter((n) => !n.readAt)
  const read = notifications.filter((n) => n.readAt)

  return (
    <div className="flex flex-col gap-6">
      {unreadCount > 0 && (
        <div className="flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void markAllRead()
            }}
          >
            <CircleCheckBig className="size-4" />
            Mark all read ({unreadCount})
          </Button>
        </div>
      )}

      {unread.length > 0 && (
        <Section title="Unread">
          <Rows items={unread} onMarkRead={markAsRead} />
        </Section>
      )}

      {read.length > 0 && (
        <Section title="Earlier">
          <Rows items={read} onMarkRead={markAsRead} />
        </Section>
      )}
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        {title}
      </h2>
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
        {children}
      </ul>
    </section>
  )
}

function Rows({
  items,
  onMarkRead,
}: {
  items: NotificationItem[]
  onMarkRead: (id: string) => Promise<void> | void
}) {
  return (
    <>
      {items.map((n) => (
        <Row key={n.id} item={n} onMarkRead={onMarkRead} />
      ))}
    </>
  )
}

function Row({
  item,
  onMarkRead,
}: {
  item: NotificationItem
  onMarkRead: (id: string) => Promise<void> | void
}) {
  const content = (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          item.readAt ? "bg-transparent" : "bg-primary",
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate font-medium">{item.title}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {formatDateTime(item.createdAt)}
          </span>
        </div>
        {item.body && (
          <p className="mt-0.5 text-sm text-muted-foreground">{item.body}</p>
        )}
      </div>
    </div>
  )

  const className = cn(
    "block px-4 py-3 transition-colors hover:bg-muted/50",
    !item.readAt && "bg-muted/30",
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
          {content}
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
        {content}
      </button>
    </li>
  )
}
