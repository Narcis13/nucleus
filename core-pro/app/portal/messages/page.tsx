import { MessageCircle } from "lucide-react"

import { MessageInput } from "@/components/shared/chat/message-input"
import { MessageThread } from "@/components/shared/chat/message-thread"
import { EmptyState, PageHeader } from "@/components/shared/page-header"
import {
  getMessages,
  getOrCreatePortalConversation,
} from "@/lib/db/queries/messages"
import { getProfessionalForClientPortal } from "@/lib/db/queries/professionals"

// ─────────────────────────────────────────────────────────────────────────────
// Portal → Messages
//
// A client only ever has one conversation: with the professional whose
// workspace they belong to. We resolve (or lazily create) it server-side, then
// render the same shared chat components the dashboard uses — just in a
// single-column layout with no conversation list.
// ─────────────────────────────────────────────────────────────────────────────
export default async function PortalMessagesPage() {
  const [professional, bootstrap] = await Promise.all([
    getProfessionalForClientPortal(),
    getOrCreatePortalConversation(),
  ])

  if (!bootstrap) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Messages"
          description="Chat directly with your professional."
        />
        <EmptyState
          icon={<MessageCircle />}
          title="Inbox unavailable"
          description="We couldn't find your professional. If you were recently invited, try refreshing in a minute."
        />
      </div>
    )
  }

  const messages = await getMessages(bootstrap.conversation.id)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Messages"
        description={
          professional
            ? `Chat with ${professional.fullName}`
            : "Chat directly with your professional."
        }
      />

      <div className="flex h-[calc(100dvh-220px)] min-h-[480px] flex-col overflow-hidden rounded-lg border border-border bg-background">
        <div className="flex-1 min-h-0">
          <MessageThread
            conversationId={bootstrap.conversation.id}
            initial={messages}
            currentSenderId={bootstrap.clientId}
            otherPartyLabel={professional?.fullName}
          />
        </div>
        <MessageInput
          conversationId={bootstrap.conversation.id}
          owner={{ id: bootstrap.clientId, role: "client" }}
        />
      </div>
    </div>
  )
}
