"use client"

import { useAction } from "next-safe-action/hooks"
import { useState, type FormEvent } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { dispatchMessageAppend } from "@/hooks/use-realtime"
import { simulateClientReplyAction } from "@/lib/actions/messages"

// Dev-only strip that injects a message into the current conversation as if
// the client had sent it. Lets a solo dev exercise the two-way realtime loop
// without spinning up a second browser session for the portal.
export function SimulateClientReply({
  conversationId,
  clientName,
}: {
  conversationId: string
  clientName: string
}) {
  const [text, setText] = useState("")
  const { execute, isExecuting } = useAction(simulateClientReplyAction, {
    onSuccess: ({ data }) => {
      setText("")
      if (!data) return
      dispatchMessageAppend({
        id: data.id,
        conversationId: data.conversationId,
        senderId: data.senderId,
        senderRole: data.senderRole,
        content: data.content,
        type: data.type,
        mediaUrl: data.mediaUrl,
        readAt: data.readAt ? new Date(data.readAt) : null,
        createdAt: new Date(data.createdAt),
      })
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't simulate reply.")
    },
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || isExecuting) return
    execute({ conversationId, content: trimmed })
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 border-b border-dashed border-amber-500/50 bg-amber-500/5 px-3 py-2"
    >
      <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
        Dev
      </span>
      <Input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={`Send as ${clientName}…`}
        disabled={isExecuting}
        className="h-8 flex-1"
      />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={isExecuting || text.trim().length === 0}
      >
        Simulate reply
      </Button>
    </form>
  )
}
