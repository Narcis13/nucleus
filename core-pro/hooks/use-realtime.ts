"use client"

import { useEffect, useRef, useState } from "react"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

import { useSupabaseBrowser } from "@/lib/supabase/client"
import type { Conversation, Message } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// Realtime subscriptions — Supabase `postgres_changes` via the browser client.
//
// Two public hooks:
//   • useMessages(conversationId) — stream of messages in a thread (INSERT +
//     UPDATE so `read_at` flips propagate to the sender's UI).
//   • useConversations(professionalId) — stream of conversation row changes
//     for the list sidebar (new thread, `last_message_at` bump, etc.).
//
// The Supabase client returned by `useSupabaseBrowser` forwards Clerk's JWT
// on every request (including the realtime websocket), so the server-side
// RLS policies on `messages`/`conversations` decide what each subscriber
// can see — no auth logic needed in this file.
// ─────────────────────────────────────────────────────────────────────────────

// Raw postgres row shape Supabase emits. We re-map to our Drizzle-inferred
// camelCase domain types before handing to consumers.
type MessageRow = {
  id: string
  conversation_id: string
  sender_id: string
  sender_role: string
  content: string | null
  type: string
  media_url: string | null
  read_at: string | null
  created_at: string
}

type ConversationRow = {
  id: string
  professional_id: string
  client_id: string
  last_message_at: string | null
  created_at: string
}

function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderRole: row.sender_role,
    content: row.content,
    type: row.type,
    mediaUrl: row.media_url,
    readAt: row.read_at ? new Date(row.read_at) : null,
    createdAt: new Date(row.created_at),
  }
}

function toConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    professionalId: row.professional_id,
    clientId: row.client_id,
    lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : null,
    createdAt: new Date(row.created_at),
  }
}

export type UseMessagesOptions = {
  initial?: Message[]
}

// Subscribes to INSERT + UPDATE on `messages` filtered to a single conversation.
// Returns the running list sorted ascending (oldest → newest) so consumers can
// render directly without re-sorting on every tick.
export function useMessages(
  conversationId: string | null,
  options: UseMessagesOptions = {},
): {
  messages: Message[]
  appendLocal: (m: Message) => void
} {
  const supabase = useSupabaseBrowser()
  const [messages, setMessages] = useState<Message[]>(options.initial ?? [])

  // Re-seed when the server-rendered list changes (e.g. navigating to a
  // different conversation). Tracked by id so we don't thrash on every render.
  const seededFor = useRef<string | null>(null)
  useEffect(() => {
    if (seededFor.current !== conversationId) {
      seededFor.current = conversationId
      setMessages(options.initial ?? [])
    }
    // Deliberately ignoring `options.initial` — it's re-allocated on every
    // render by the caller, which would defeat the seed guard above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  useEffect(() => {
    if (!conversationId) return
    const channel = supabase
      .channel(`messages:${conversationId}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: RealtimePostgresChangesPayload<MessageRow>) => {
          const row = payload.new as MessageRow
          setMessages((prev) => {
            // Dedupe — the sender's own INSERT arrives via the channel too,
            // and we may have already appended it optimistically.
            if (prev.some((m) => m.id === row.id)) return prev
            return [...prev, toMessage(row)]
          })
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: RealtimePostgresChangesPayload<MessageRow>) => {
          const row = payload.new as MessageRow
          setMessages((prev) =>
            prev.map((m) => (m.id === row.id ? toMessage(row) : m)),
          )
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [supabase, conversationId])

  const appendLocal = (m: Message) => {
    setMessages((prev) =>
      prev.some((x) => x.id === m.id) ? prev : [...prev, m],
    )
  }

  return { messages, appendLocal }
}

export type ConversationsFilter = {
  professionalId?: string | null
  clientId?: string | null
}

// Subscribes to INSERT + UPDATE on `conversations` scoped by either the
// professional or client id (whichever side the caller is on). Consumers use
// the `tick` value as a cue to refresh their server-provided list — we don't
// try to hydrate a full joined ConversationListItem inside this hook.
export function useConversations(filter: ConversationsFilter): {
  tick: number
  lastEvent: Conversation | null
} {
  const supabase = useSupabaseBrowser()
  const [tick, setTick] = useState(0)
  const [lastEvent, setLastEvent] = useState<Conversation | null>(null)

  const professionalId = filter.professionalId ?? null
  const clientId = filter.clientId ?? null

  useEffect(() => {
    if (!professionalId && !clientId) return
    const filterString = professionalId
      ? `professional_id=eq.${professionalId}`
      : `client_id=eq.${clientId}`

    const channel = supabase
      .channel(`conversations:${professionalId ?? clientId}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: filterString,
        },
        (payload: RealtimePostgresChangesPayload<ConversationRow>) => {
          const row = (payload.new ?? payload.old) as ConversationRow
          if (row) setLastEvent(toConversation(row))
          setTick((n) => n + 1)
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          // Any new message anywhere can bump `last_message_at` on one of our
          // conversations — cheapest way to keep unread counts fresh is a
          // tick. The consumer re-fetches the list server-side.
          setTick((n) => n + 1)
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [supabase, professionalId, clientId])

  return { tick, lastEvent }
}
