"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

import { useSupabaseBrowser } from "@/lib/supabase/client"
import { useUserRole } from "@/hooks/use-user-role"
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/actions/notifications"

// ─────────────────────────────────────────────────────────────────────────────
// useNotifications / useUnreadCount
//
// Backed by the `notifications` table via Supabase (RLS-scoped to the caller).
// A single postgres_changes channel refreshes the list on INSERT/UPDATE, so
// the bell badge and dropdown stay live without polling.
//
// The consumer shape is kept compatible with what the dashboard topbar already
// imports (notifications / unreadCount / markAllRead), with extras:
//   • markAsRead(id)
//   • items include href/readAt/createdAt as Date objects
//   • isLoaded flag so callers can differentiate "0 notifications" from
//     "still loading" (important for the bell — don't show "all caught up"
//     until we actually know).
// ─────────────────────────────────────────────────────────────────────────────

export type NotificationItem = {
  id: string
  type: string
  title: string
  body: string | null
  href: string | null
  readAt: Date | null
  createdAt: Date
}

export type NotificationsState = {
  isLoaded: boolean
  notifications: NotificationItem[]
  unreadCount: number
  markAsRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  refresh: () => Promise<void>
}

type NotificationRow = {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read_at: string | null
  created_at: string
}

function toItem(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.link,
    readAt: row.read_at ? new Date(row.read_at) : null,
    createdAt: new Date(row.created_at),
  }
}

type UseNotificationsOptions = {
  limit?: number
}

export function useNotifications(
  options: UseNotificationsOptions = {},
): NotificationsState {
  const { limit = 50 } = options
  const supabase = useSupabaseBrowser()
  const { isLoaded: roleLoaded, role } = useUserRole()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [hasFetched, setHasFetched] = useState(false)

  // No subscription is possible for signed-out / non-member users; treat them
  // as "loaded with zero notifications" so consumers show empty state instead
  // of an infinite spinner. Derived at render time to avoid cascading setState
  // inside an effect.
  const isActiveRole = role === "professional" || role === "client"
  const isLoaded = roleLoaded && (!isActiveRole || hasFetched)

  // Ref keeps the latest `limit` reachable from the realtime callback without
  // re-subscribing whenever the caller passes a different value. Mutating in
  // an effect (not during render) keeps React's refs rule happy.
  const limitRef = useRef(limit)
  useEffect(() => {
    limitRef.current = limit
  }, [limit])

  // Exposed `refresh` lets consumers force-refetch (e.g. after a server
  // action that bypassed realtime). The ref double-buffers the current impl
  // so the stable exported function survives re-renders without resubscribing
  // the realtime channel.
  const refreshRef = useRef<() => Promise<void>>(async () => {})
  const refresh = useCallback(() => refreshRef.current(), [])

  useEffect(() => {
    if (!roleLoaded || !isActiveRole) return

    let cancelled = false
    const fetchLatest = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id,type,title,body,link,read_at,created_at")
        .order("created_at", { ascending: false })
        .limit(limitRef.current)
      if (cancelled) return
      if (error) return
      setItems((data ?? []).map((row) => toItem(row as NotificationRow)))
      setHasFetched(true)
    }
    refreshRef.current = fetchLatest
    void fetchLatest()

    const channel = supabase
      .channel(`notifications:${role}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload: RealtimePostgresChangesPayload<NotificationRow>) => {
          const row = payload.new as NotificationRow
          setItems((prev) => {
            if (prev.some((n) => n.id === row.id)) return prev
            return [toItem(row), ...prev].slice(0, limitRef.current)
          })
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        (payload: RealtimePostgresChangesPayload<NotificationRow>) => {
          const row = payload.new as NotificationRow
          setItems((prev) =>
            prev.map((n) => (n.id === row.id ? toItem(row) : n)),
          )
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [supabase, roleLoaded, isActiveRole, role])

  const unreadCount = useMemo(
    () => items.reduce((n, item) => (item.readAt ? n : n + 1), 0),
    [items],
  )

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic — the server action also revalidates, but the realtime UPDATE
    // will reconcile anyway.
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n)),
    )
    await markNotificationReadAction({ id })
  }, [])

  const markAllRead = useCallback(async () => {
    const now = new Date()
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })))
    await markAllNotificationsReadAction({})
  }, [])

  return {
    isLoaded,
    notifications: items,
    unreadCount,
    markAsRead,
    markAllRead,
    refresh,
  }
}

// Cheap unread-only hook for the bell badge in nav chrome — avoids fetching
// the full list when the caller only needs the count. Uses the same channel
// pattern as `useUnreadMessages`.
export function useUnreadCount(): number {
  const supabase = useSupabaseBrowser()
  const { isLoaded: roleLoaded, role } = useUserRole()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!roleLoaded) return
    if (role !== "professional" && role !== "client") return
    let cancelled = false

    const refresh = async () => {
      const { count: fresh, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null)
      if (cancelled) return
      if (error) return
      setCount(fresh ?? 0)
    }

    void refresh()

    const channel = supabase
      .channel(`notifications-count:${role}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        () => void refresh(),
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [supabase, roleLoaded, role])

  return count
}
