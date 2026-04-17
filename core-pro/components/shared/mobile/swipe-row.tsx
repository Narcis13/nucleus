"use client"

import type { ReactNode } from "react"

import { useSwipeActions } from "@/hooks/use-swipe-actions"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// <SwipeRow>
//
// Renders a list row with optional left/right action panels that reveal as
// the user swipes horizontally. The actions are real children — click them
// like any other button. When you pass `onSwipeLeft`/`onSwipeRight` the
// hook also fires those callbacks when a fling passes the snap threshold,
// letting you commit an action without requiring a tap (e.g. Mail's
// swipe-to-archive).
//
// The row is a plain <div>; semantics live on its children so this works
// equally well for <li> grids, anchor cards, etc.
// ─────────────────────────────────────────────────────────────────────────────
export function SwipeRow({
  children,
  leftActions,
  rightActions,
  leftWidth = 0,
  rightWidth = 0,
  onSwipeLeft,
  onSwipeRight,
  className,
  disabled,
}: {
  children: ReactNode
  leftActions?: ReactNode
  rightActions?: ReactNode
  leftWidth?: number
  rightWidth?: number
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  className?: string
  disabled?: boolean
}) {
  const { offset, handlers } = useSwipeActions({
    maxLeft: rightWidth,
    maxRight: leftWidth,
    onSwipedLeft: onSwipeLeft,
    onSwipedRight: onSwipeRight,
    disabled,
  })

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      data-slot="swipe-row"
    >
      {leftActions && (
        <div
          aria-hidden={offset <= 0}
          className="absolute inset-y-0 left-0 flex items-stretch"
          style={{ width: leftWidth }}
        >
          {leftActions}
        </div>
      )}
      {rightActions && (
        <div
          aria-hidden={offset >= 0}
          className="absolute inset-y-0 right-0 flex items-stretch"
          style={{ width: rightWidth }}
        >
          {rightActions}
        </div>
      )}
      <div
        {...handlers}
        style={{
          transform: `translateX(${offset}px)`,
          transition: offset === 0 ? "transform 180ms ease-out" : "none",
          touchAction: "pan-y",
        }}
        className="relative bg-background"
      >
        {children}
      </div>
    </div>
  )
}
