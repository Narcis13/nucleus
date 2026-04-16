"use client"

import { cn } from "@/lib/utils"
import type { Message } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// <MessageBubble>
//
// Renders a single chat message. `isOwn` flips alignment + colour so the
// caller's messages hug the right edge in the primary colour, and the other
// party's messages sit on the left in muted surface colour. Supports text +
// image + file (attachment chip) types.
// ─────────────────────────────────────────────────────────────────────────────
export function MessageBubble({
  message,
  isOwn,
  authorLabel,
  showAuthor,
}: {
  message: Message
  isOwn: boolean
  authorLabel?: string
  showAuthor?: boolean
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-1",
        isOwn ? "items-end" : "items-start",
      )}
    >
      {showAuthor && authorLabel && (
        <span className="px-1 text-[11px] text-muted-foreground">
          {authorLabel}
        </span>
      )}
      <div
        className={cn(
          "flex max-w-[80%] flex-col gap-1 rounded-2xl px-3 py-2 text-sm break-words",
          isOwn
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md bg-muted text-foreground",
        )}
      >
        {message.type === "image" && message.mediaUrl && (
          <a
            href={message.mediaUrl}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-lg"
          >
            {/* User-supplied URLs — skip next/image to avoid a remotePatterns entry for every storage hostname a fork might use. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.mediaUrl}
              alt="attachment"
              className="max-h-64 w-full rounded-lg object-cover"
            />
          </a>
        )}
        {message.type === "file" && message.mediaUrl && (
          <a
            href={message.mediaUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs underline-offset-2 hover:underline",
              isOwn
                ? "border-primary-foreground/30 text-primary-foreground"
                : "border-border text-foreground",
            )}
          >
            📎 Attachment
          </a>
        )}
        {message.content && (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}
      </div>
      <span
        className={cn(
          "px-1 text-[10px] text-muted-foreground",
          isOwn ? "text-right" : "text-left",
        )}
      >
        {formatTime(message.createdAt)}
        {isOwn && (
          <>
            {" · "}
            {message.readAt ? "Seen" : "Sent"}
          </>
        )}
      </span>
    </div>
  )
}

function formatTime(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}
