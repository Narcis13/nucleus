"use client"

import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useConversations } from "@/hooks/use-realtime"
import { cn, getInitials } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// <ConversationList>
//
// Dashboard-only sidebar that shows every client thread for the current
// professional. Selecting a row pushes `?c=<id>` so the chat panel on the
// right can read it from the URL (keeps the state shareable + back-button
// friendly without a server round-trip).
// ─────────────────────────────────────────────────────────────────────────────

export type ConversationListItem = {
  id: string
  clientId: string
  clientName: string
  clientAvatarUrl: string | null
  lastMessageAt: Date | string | null
  lastMessagePreview: string | null
  unreadCount: number
}

export function ConversationList({
  professionalId,
  conversations,
  selectedId,
}: {
  professionalId: string
  conversations: ConversationListItem[]
  selectedId: string | null
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")

  // Tick-based cache invalidation — when the realtime hook reports any
  // conversation-level change, we refresh the page so the server-rendered
  // list (with its fresh previews + unread counts) updates.
  const { tick } = useConversations({ professionalId })
  useEffect(() => {
    if (tick > 0) router.refresh()
    // Router + tick-only; intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter((c) => c.clientName.toLowerCase().includes(q))
  }, [conversations, query])

  const onSelect = (id: string) => {
    const params = new URLSearchParams(window.location.search)
    params.set("c", id)
    router.push(`/dashboard/messages?${params.toString()}`)
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-border">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Search className="size-4 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          placeholder="Search conversations"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            {conversations.length === 0
              ? "No conversations yet."
              : "No matches."}
          </p>
        ) : (
          <ul className="flex flex-col">
            {filtered.map((conv) => (
              <li key={conv.id}>
                <button
                  type="button"
                  onClick={() => onSelect(conv.id)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-border/60 px-3 py-2 text-left transition-colors hover:bg-muted/60",
                    selectedId === conv.id && "bg-muted",
                  )}
                >
                  <Avatar size="sm">
                    {conv.clientAvatarUrl && (
                      <AvatarImage
                        src={conv.clientAvatarUrl}
                        alt={conv.clientName}
                      />
                    )}
                    <AvatarFallback>
                      {getInitials(conv.clientName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {conv.clientName}
                      </p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatRelativeTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-muted-foreground">
                        {conv.lastMessagePreview ?? "No messages yet"}
                      </p>
                      {conv.unreadCount > 0 && (
                        <Badge
                          variant="default"
                          className="h-4 min-w-[1.1rem] px-1 text-[10px]"
                        >
                          {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function formatRelativeTime(date: Date | string | null): string {
  if (!date) return ""
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ""
  const diff = Date.now() - d.getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return "now"
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return d.toLocaleDateString([], { day: "numeric", month: "short" })
}
