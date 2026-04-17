"use client"

import type { ReactNode } from "react"
import { ArrowDown, Loader2 } from "lucide-react"

import { usePullToRefresh } from "@/hooks/use-pull-to-refresh"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// <PullToRefresh>
//
// Drop-in wrapper that turns its child scroll container into a pull-to-
// refresh surface. Renders a minimal indicator that fades in with the pull
// and spins while `onRefresh` is running.
//
// The wrapper element is the scroll container — set a max-height / overflow
// on its className if the page doesn't already scroll. On short lists you
// can leave it without overflow and the gesture still works from the top.
// ─────────────────────────────────────────────────────────────────────────────
export function PullToRefresh({
  onRefresh,
  children,
  className,
  disabled,
}: {
  onRefresh: () => void | Promise<void>
  children: ReactNode
  className?: string
  disabled?: boolean
}) {
  const { ref, pullDistance, isRefreshing, thresholdReached } =
    usePullToRefresh<HTMLDivElement>({ onRefresh, disabled })

  return (
    <div
      ref={ref}
      className={cn("relative overflow-y-auto overscroll-contain", className)}
    >
      <div
        aria-hidden={pullDistance === 0 && !isRefreshing}
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 flex justify-center",
          "transition-[transform,opacity] will-change-transform",
          isRefreshing ? "duration-0" : "duration-150 ease-out",
        )}
        style={{
          transform: `translateY(${Math.max(pullDistance - 32, -32)}px)`,
          opacity: Math.min(pullDistance / 48, 1),
        }}
      >
        <div className="mt-2 flex size-8 items-center justify-center rounded-full border border-border bg-background shadow-sm">
          {isRefreshing ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <ArrowDown
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                thresholdReached && "rotate-180 text-foreground",
              )}
            />
          )}
        </div>
      </div>

      <div
        style={{
          transform:
            pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: isRefreshing ? "none" : "transform 150ms ease-out",
        }}
      >
        {children}
      </div>
    </div>
  )
}
