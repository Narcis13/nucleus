"use client"

import { cn } from "@/lib/utils"

// Three-dot typing indicator. Driven by the parent via `show`; the animation
// is CSS-only so it doesn't re-render on every tick of a timer.
export function TypingIndicator({
  show,
  label,
}: {
  show: boolean
  label?: string
}) {
  return (
    <div
      aria-live="polite"
      className={cn(
        "flex items-center gap-2 px-3 py-1 text-xs text-muted-foreground transition-opacity",
        show ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <span className="inline-flex items-center gap-0.5">
        <Dot delay="0ms" />
        <Dot delay="150ms" />
        <Dot delay="300ms" />
      </span>
      {label && <span className="truncate">{label} is typing…</span>}
    </div>
  )
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60"
      style={{ animationDelay: delay }}
    />
  )
}
