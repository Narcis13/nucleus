"use client"

import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useConversations } from "@/hooks/use-realtime"
import { cn, getInitials } from "@/lib/utils"
import type { Message } from "@/types/domain"

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

  // Local mirror of the server-provided list. We apply Realtime events
  // optimistically (preview + unread + reorder) instead of router.refresh(),
  // which collides with RSC rendering on rapid-fire bursts.
  const [items, setItems] = useState<ConversationListItem[]>(conversations)

  // Re-seed when the server payload genuinely changes (e.g., user navigates
  // back here from another page). Compare by a composite key so we don't
  // clobber our optimistic state on every parent re-render.
  const seedKey = useMemo(
    () =>
      conversations
        .map((c) => `${c.id}:${c.lastMessageAt ?? ""}:${c.unreadCount}`)
        .join("|"),
    [conversations],
  )
  useEffect(() => {
    setItems(conversations)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey])

  const { lastConversationEvent, lastMessageEvent } = useConversations({
    professionalId,
  })

  // New message anywhere → update the matching row's preview + unread.
  useEffect(() => {
    if (!lastMessageEvent) return
    applyMessage(setItems, lastMessageEvent, selectedId)
  }, [lastMessageEvent, selectedId])

  // New/updated conversation. INSERT of an id we've never seen means a fresh
  // thread was just created elsewhere — rare, so a single router.refresh()
  // picks up the joined client info without hammering RSC.
  useEffect(() => {
    if (!lastConversationEvent) return
    const { conversation, kind } = lastConversationEvent
    if (kind === "INSERT") {
      const known = items.some((i) => i.id === conversation.id)
      if (!known) router.refresh()
    } else if (kind === "UPDATE") {
      setItems((prev) =>
        prev.map((i) =>
          i.id === conversation.id
            ? { ...i, lastMessageAt: conversation.lastMessageAt }
            : i,
        ),
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastConversationEvent])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q
      ? items.filter((c) => c.clientName.toLowerCase().includes(q))
      : items
    // Newest-first, stable when timestamps are equal.
    return [...base].sort((a, b) => {
      const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
      const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
      return bt - at
    })
  }, [items, query])

  const onSelect = (id: string) => {
    const params = new URLSearchParams(window.location.search)
    params.set("c", id)
    // Selecting a row clears its unread locally — mark-read runs on the
    // thread side and the UPDATE broadcasts to the other side via Realtime.
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, unreadCount: 0 } : i)),
    )
    router.push(`/dashboard/messages?${params.toString()}`)
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-border">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Search className="size-4 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          aria-label="Search conversations"
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

// Merges a new message into the list: bumps `lastMessageAt`, updates
// preview, and increments unread only when it's a *client* message on a
// thread the pro doesn't currently have open.
function applyMessage(
  setItems: React.Dispatch<React.SetStateAction<ConversationListItem[]>>,
  message: Message,
  selectedId: string | null,
) {
  const preview =
    message.content ??
    (message.type === "image" ? "📷 Photo" : message.type === "file" ? "📎 Attachment" : "")
  setItems((prev) => {
    const idx = prev.findIndex((i) => i.id === message.conversationId)
    if (idx === -1) return prev // unknown — conversation INSERT will trigger a refresh
    const row = prev[idx]
    const inc =
      message.senderRole === "client" && message.conversationId !== selectedId
        ? 1
        : 0
    const next: ConversationListItem = {
      ...row,
      lastMessageAt: message.createdAt,
      lastMessagePreview: preview,
      unreadCount: row.unreadCount + inc,
    }
    return [...prev.slice(0, idx), next, ...prev.slice(idx + 1)]
  })
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
