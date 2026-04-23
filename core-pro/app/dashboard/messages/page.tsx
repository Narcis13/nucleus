import { MessageCircle } from "lucide-react"
import { redirect } from "next/navigation"

import { ConversationList } from "@/components/shared/chat/conversation-list"
import { MessageInput } from "@/components/shared/chat/message-input"
import { MessageThread } from "@/components/shared/chat/message-thread"
import { SimulateClientReply } from "@/components/dashboard/messages/simulate-client-reply"
import { EmptyState, PageHeader } from "@/components/shared/page-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getConversation, getConversations, getMessages } from "@/lib/db/queries/messages"
import { getProfessional } from "@/lib/db/queries/professionals"
import { env } from "@/lib/env"
import { getInitials } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard → Messages
//
// Two-pane inbox: left = conversation list, right = active thread.
// The selected conversation lives in `?c=<id>` so the URL stays shareable and
// back-button navigation works without losing place. When no id is provided
// we default to the newest conversation.
// ─────────────────────────────────────────────────────────────────────────────
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>
}) {
  const [{ c }, professional, list] = await Promise.all([
    searchParams,
    getProfessional(),
    getConversations(),
  ])

  if (!professional) {
    redirect("/onboarding")
  }

  const selectedId = c ?? list[0]?.conversation.id ?? null
  const [detail, thread] = await Promise.all([
    selectedId ? getConversation(selectedId) : Promise.resolve(null),
    selectedId ? getMessages(selectedId) : Promise.resolve([]),
  ])

  const conversations = list.map((row) => ({
    id: row.conversation.id,
    clientId: row.client.id,
    clientName: row.client.fullName,
    clientAvatarUrl: row.client.avatarUrl,
    lastMessageAt: row.conversation.lastMessageAt,
    lastMessagePreview: row.lastMessagePreview,
    unreadCount: row.unreadCount,
  }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Messages"
        description="Real-time conversations with your clients."
      />

      {conversations.length === 0 ? (
        <EmptyState
          icon={<MessageCircle />}
          title="No conversations yet"
          description="Open a client profile and tap 'Message' to start a thread."
        />
      ) : (
        <div className="grid h-[calc(100dvh-220px)] min-h-[480px] grid-cols-1 overflow-hidden rounded-lg border border-border bg-background md:grid-cols-[minmax(0,280px)_1fr]">
          <div className="hidden min-h-0 md:flex">
            <div className="flex w-full min-w-0 flex-col">
              <ConversationList
                professionalId={professional.id}
                conversations={conversations}
                selectedId={selectedId}
              />
            </div>
          </div>

          <div className="flex min-h-0 flex-col">
            {detail && selectedId ? (
              <>
                <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                  <Avatar size="sm">
                    {detail.client.avatarUrl && (
                      <AvatarImage
                        src={detail.client.avatarUrl}
                        alt={detail.client.fullName}
                      />
                    )}
                    <AvatarFallback>
                      {getInitials(detail.client.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {detail.client.fullName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {detail.client.email}
                    </p>
                  </div>
                </div>
                {env.NODE_ENV !== "production" && (
                  <SimulateClientReply
                    conversationId={selectedId}
                    clientName={detail.client.fullName}
                  />
                )}
                <div className="flex-1 min-h-0">
                  <MessageThread
                    conversationId={selectedId}
                    initial={thread}
                    currentSenderId={professional.id}
                    otherPartyLabel={detail.client.fullName}
                  />
                </div>
                <MessageInput
                  conversationId={selectedId}
                  owner={{ id: professional.id, role: "professional" }}
                />
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                Select a conversation.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
