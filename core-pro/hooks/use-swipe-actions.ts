"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// useSwipeActions
//
// Reveals left- and/or right-side action drawers on list items via a
// horizontal drag. Designed for message lists, notification lists, and any
// "mark read / archive" row actions where a long-press or kebab menu would
// feel heavy on mobile.
//
//   • Follows the finger 1:1 inside the revealed area, with a light rubber
//     band past the max.
//   • Snaps open past 40% of max; snaps closed otherwise (release-speed
//     optional — plain distance threshold keeps the implementation small).
//   • Returns handlers you spread onto the draggable row + the computed
//     translation so the caller controls styling.
//
// Usage:
//   const { handlers, offset, close } = useSwipeActions({ maxLeft: 96 })
//   <div {...handlers} style={{ transform: `translateX(${offset}px)` }} />
// ─────────────────────────────────────────────────────────────────────────────

type Options = {
  // Positive px the row can travel to the right (reveals left-side actions).
  maxRight?: number
  // Positive px the row can travel to the left (reveals right-side actions).
  // Pass a positive number; the hook negates it internally.
  maxLeft?: number
  // Triggered when the row is swiped past the snap threshold.
  onSwipedLeft?: () => void
  onSwipedRight?: () => void
  disabled?: boolean
}

export function useSwipeActions({
  maxRight = 0,
  maxLeft = 0,
  onSwipedLeft,
  onSwipedRight,
  disabled = false,
}: Options = {}) {
  const [offset, setOffset] = useState(0)
  const startRef = useRef<{ x: number; y: number; offset: number } | null>(null)
  const lockedRef = useRef<"h" | "v" | null>(null)

  const close = useCallback(() => setOffset(0), [])

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return
      const t = e.touches[0]
      startRef.current = { x: t.clientX, y: t.clientY, offset }
      lockedRef.current = null
    },
    [disabled, offset],
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!startRef.current) return
      const t = e.touches[0]
      const dx = t.clientX - startRef.current.x
      const dy = t.clientY - startRef.current.y
      // Lock the axis on first meaningful movement so a vertical scroll
      // doesn't flicker the row offset.
      if (!lockedRef.current) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
        lockedRef.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v"
      }
      if (lockedRef.current !== "h") return
      let next = startRef.current.offset + dx
      if (next > maxRight) {
        next = maxRight + (next - maxRight) * 0.3
      } else if (next < -maxLeft) {
        next = -maxLeft + (next + maxLeft) * 0.3
      }
      setOffset(next)
    },
    [maxLeft, maxRight],
  )

  const onTouchEnd = useCallback(() => {
    if (!startRef.current) return
    startRef.current = null
    if (lockedRef.current !== "h") {
      lockedRef.current = null
      return
    }
    lockedRef.current = null
    if (offset >= maxRight * 0.4 && maxRight > 0) {
      setOffset(maxRight)
      onSwipedRight?.()
    } else if (offset <= -maxLeft * 0.4 && maxLeft > 0) {
      setOffset(-maxLeft)
      onSwipedLeft?.()
    } else {
      setOffset(0)
    }
  }, [maxLeft, maxRight, offset, onSwipedLeft, onSwipedRight])

  // Close the drawer on any external click so tapping elsewhere dismisses
  // the revealed actions — matches iOS Mail behaviour.
  useEffect(() => {
    if (offset === 0) return
    const onDocPointer = () => setOffset(0)
    document.addEventListener("pointerdown", onDocPointer, { once: true })
    return () => document.removeEventListener("pointerdown", onDocPointer)
  }, [offset])

  return {
    offset,
    close,
    isOpen: offset !== 0,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
    },
  }
}
