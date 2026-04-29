"use client"

import { useAction } from "next-safe-action/hooks"
import { useEffect, useRef } from "react"

import {
  markMessagesAsReadAction,
  portalMarkMessagesAsReadAction,
} from "@/lib/actions/messages"
import { useMessages } from "@/hooks/use-realtime"
import { cn } from "@/lib/utils"
import type { Message } from "@/types/domain"

import { MessageBubble } from "./message-bubble"
import { TypingIndicator } from "./typing-indicator"

// ─────────────────────────────────────────────────────────────────────────────
// <MessageThread>
//
// Realtime-aware scrollable list of messages for a single conversation.
//
// Subscribes via `useMessages`, auto-scrolls to the newest entry on change,
// and fires `markMessagesAsRead` on mount + whenever a new inbound message
// arrives so the unread badge clears while the thread is open.
// ─────────────────────────────────────────────────────────────────────────────

// Either auth flavour of the mark-read action — same input/output shape.
type MarkReadAction =
  | typeof markMessagesAsReadAction
  | typeof portalMarkMessagesAsReadAction

export function MessageThread({
  conversationId,
  initial,
  currentSenderId,
  otherPartyLabel,
  emptyState,
  markReadAction = markMessagesAsReadAction,
}: {
  conversationId: string
  initial: Message[]
  currentSenderId: string
  otherPartyLabel?: string
  emptyState?: string
  markReadAction?: MarkReadAction
}) {
  const { messages } = useMessages(conversationId, { initial })
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const { execute: markRead } = useAction(markReadAction)

  // Scroll-to-bottom on new messages. `smooth` would fight ongoing user
  // scroll; we use instant scroll since the container only renders inside the
  // chat panel and the user expects the newest message to stay pinned.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length, conversationId])

  // Mark incoming messages read whenever the list updates — idempotent on
  // the server (WHERE read_at IS NULL). Debounced implicitly by React batching.
  useEffect(() => {
    if (!conversationId) return
    const hasInbound = messages.some(
      (m) => m.senderId !== currentSenderId && !m.readAt,
    )
    if (hasInbound) markRead({ conversationId })
  }, [messages, conversationId, currentSenderId, markRead])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={scrollRef}
        className={cn(
          "flex-1 space-y-3 overflow-y-auto px-4 py-4",
          messages.length === 0 && "flex items-center justify-center",
        )}
      >
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {emptyState ?? "No messages yet — say hi!"}
          </p>
        ) : (
          messages.map((message, index) => {
            const isOwn = message.senderId === currentSenderId
            const prev = messages[index - 1]
            // Only tag the author on the first message of a run from the
            // same sender, to keep the thread visually uncluttered.
            const showAuthor =
              !isOwn && (!prev || prev.senderId !== message.senderId)
            return (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={isOwn}
                authorLabel={otherPartyLabel}
                showAuthor={showAuthor}
              />
            )
          })
        )}
      </div>
      <TypingIndicator show={false} />
    </div>
  )
}
