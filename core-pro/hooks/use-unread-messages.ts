"use client"

import { useEffect, useState } from "react"

import { useUserRole } from "@/hooks/use-user-role"
import { useSupabaseBrowser } from "@/lib/supabase/client"

// ─────────────────────────────────────────────────────────────────────────────
// useUnreadMessages
//
// Powers the "Messages" nav badge (sidebar + mobile tab bar). Counts messages
// addressed to the *current* user that haven't been read yet — client-authored
// messages for a professional viewer, and vice versa.
//
// RLS on `messages` already scopes the query to the viewer's own conversations,
// so the count is correct without passing an id explicitly. A realtime channel
// watches INSERT/UPDATE on `messages` and re-runs the count; this keeps the
// badge live without the overhead of a full conversation re-fetch.
// ─────────────────────────────────────────────────────────────────────────────
export function useUnreadMessages(): number {
  const { role } = useUserRole()
  const supabase = useSupabaseBrowser()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!role || (role !== "professional" && role !== "client")) {
      // Leave count at its last value — role transitions at runtime are rare
      // (signed in → out is a full navigation), and resetting here would
      // trigger a cascading render warning from the React lint plugin.
      return
    }
    const senderToCount = role === "professional" ? "client" : "professional"
    let cancelled = false

    const refresh = async () => {
      const { count: fresh, error } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("sender_role", senderToCount)
        .is("read_at", null)
      if (cancelled) return
      if (error) return
      setCount(fresh ?? 0)
    }

    void refresh()

    const channel = supabase
      .channel(`unread-messages:${role}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => void refresh(),
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [supabase, role])

  return count
}
