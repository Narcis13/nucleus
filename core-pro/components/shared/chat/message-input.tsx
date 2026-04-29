"use client"

import { Paperclip, Send } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import {
  useCallback,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { dispatchMessageAppend } from "@/hooks/use-realtime"
import {
  portalSendMessageAction,
  sendMessageAction,
} from "@/lib/actions/messages"
import { useSupabaseBrowser } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// <MessageInput>
//
// Textarea + send button + attachment button. Pressing Enter sends the
// message; Shift+Enter inserts a newline. Attachments are uploaded to the
// `media` bucket under `<ownerId>/<conversationId>/<filename>` so the storage
// policies (see 9901_storage_policies.sql) let both sides read them.
// ─────────────────────────────────────────────────────────────────────────────

type Owner = {
  // `id` is the professional's or client's uuid — used as the top-level
  // folder in the `media` bucket.
  id: string
  role: "professional" | "client"
}

// The dashboard and portal both send messages, but auth differs (Clerk vs
// portal cookie). Either variant has the same input/output shape so the
// component accepts whichever the parent provides.
type SendAction =
  | typeof sendMessageAction
  | typeof portalSendMessageAction

export function MessageInput({
  conversationId,
  owner,
  disabled,
  onBeforeSend,
  sendAction = sendMessageAction,
}: {
  conversationId: string
  owner: Owner
  disabled?: boolean
  onBeforeSend?: () => void
  sendAction?: SendAction
}) {
  const [text, setText] = useState("")
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = useSupabaseBrowser()

  const { execute, isExecuting } = useAction(sendAction, {
    onSuccess: ({ data }) => {
      if (!data) return
      // Append immediately on the sender side so the bubble appears without
      // waiting for the Realtime round-trip. `useMessages` dedupes by id
      // when the same row arrives via the channel a beat later.
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
      toast.error(error.serverError ?? "Couldn't send message.")
    },
  })

  const busy = disabled || isExecuting || uploading

  const submit = useCallback(
    (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault()
      const trimmed = text.trim()
      if (!trimmed || busy) return
      onBeforeSend?.()
      execute({ conversationId, content: trimmed, type: "text" })
      setText("")
    },
    [text, busy, conversationId, execute, onBeforeSend],
  )

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  const onFileChosen = async (file: File) => {
    setUploading(true)
    try {
      // Path convention: <ownerId>/<conversationId>/<timestamp>-<safeName>.
      // The storage policies allow reads by either the professional (by top
      // folder) or the client (by their id in the second segment) — the
      // owner id here is either the pro's or the client's uuid, which the
      // media policy in 9901_storage_policies.sql already permits.
      const safeName = file.name.replace(/[^\w.\-]+/g, "_")
      const objectPath = `${owner.id}/${conversationId}/${Date.now()}-${safeName}`
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(objectPath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        })
      if (uploadError) {
        throw uploadError
      }

      // Private bucket → signed URL that lasts a week. We store the URL on
      // the message so both sides can render the attachment without a fresh
      // sign-request on every chat render.
      const { data: signed, error: signError } = await supabase.storage
        .from("media")
        .createSignedUrl(objectPath, 60 * 60 * 24 * 7)
      if (signError || !signed?.signedUrl) {
        throw signError ?? new Error("Failed to sign attachment URL")
      }

      const type = file.type.startsWith("image/") ? "image" : "file"
      onBeforeSend?.()
      execute({
        conversationId,
        content: text.trim() || undefined,
        type,
        mediaUrl: signed.signedUrl,
      })
      setText("")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't upload attachment.",
      )
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <form
      onSubmit={submit}
      className={cn(
        "flex items-end gap-2 border-t border-border bg-background px-3 py-2",
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Attach file"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
      >
        <Paperclip />
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void onFileChosen(file)
        }}
      />
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Type a message…"
        disabled={busy}
        rows={1}
        className="max-h-40 min-h-9 resize-none"
      />
      <Button
        type="submit"
        size="icon-sm"
        aria-label="Send"
        disabled={busy || text.trim().length === 0}
      >
        <Send />
      </Button>
    </form>
  )
}
