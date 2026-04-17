"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react"

// ─────────────────────────────────────────────────────────────────────────────
// usePullToRefresh
//
// Native-feeling pull-to-refresh for touch devices. The hook owns all the
// touch math; the consumer just wires the ref to a scroll container and
// reads `{ pullDistance, isRefreshing }` to render an indicator.
//
// Design choices:
//   • Only triggers when the container is scrolled to the absolute top
//     (scrollTop === 0). This keeps mid-scroll interactions unaffected.
//   • Applies a damping curve so the indicator feels resistant past the
//     threshold instead of flying away.
//   • Skips the gesture entirely in PWA standalone mode on platforms where
//     the OS already provides pull-to-refresh (no opt-out currently; all
//     supported browsers either let us handle it or no-op cleanly).
//   • `onRefresh` is awaited — the indicator stays visible until the promise
//     resolves, so consumers can run server actions without extra state.
// ─────────────────────────────────────────────────────────────────────────────

type Options = {
  onRefresh: () => void | Promise<void>
  // Distance in px the finger must travel before a release triggers refresh.
  threshold?: number
  // Max distance the indicator can be dragged (visual cap).
  maxPull?: number
  disabled?: boolean
}

export function usePullToRefresh<T extends HTMLElement>({
  onRefresh,
  threshold = 72,
  maxPull = 140,
  disabled = false,
}: Options): {
  ref: RefObject<T | null>
  pullDistance: number
  isRefreshing: boolean
  thresholdReached: boolean
} {
  const ref = useRef<T>(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startYRef = useRef<number | null>(null)
  const activeRef = useRef(false)

  const finish = useCallback(async () => {
    const distance = pullDistance
    startYRef.current = null
    activeRef.current = false
    if (distance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      // Leave the indicator parked at the threshold while we run the refresh
      // so the user gets consistent feedback regardless of how far they
      // pulled.
      setPullDistance(threshold)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [pullDistance, threshold, onRefresh, isRefreshing])

  useEffect(() => {
    const el = ref.current
    if (!el || disabled) return

    const onTouchStart = (e: TouchEvent) => {
      if (isRefreshing) return
      if (el.scrollTop > 0) {
        startYRef.current = null
        activeRef.current = false
        return
      }
      startYRef.current = e.touches[0].clientY
      activeRef.current = true
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!activeRef.current || startYRef.current === null) return
      const delta = e.touches[0].clientY - startYRef.current
      if (delta <= 0) {
        setPullDistance(0)
        return
      }
      // Damped pull — once past the threshold each px travels ~0.35 display px.
      const damped =
        delta < threshold ? delta : threshold + (delta - threshold) * 0.35
      const clamped = Math.min(damped, maxPull)
      setPullDistance(clamped)
      // Only cancel the native scroll when we're actively pulling. Touchmove
      // needs to be non-passive for preventDefault to work.
      if (delta > 4 && e.cancelable) e.preventDefault()
    }

    const onTouchEnd = () => {
      if (!activeRef.current) return
      void finish()
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true })
    el.addEventListener("touchmove", onTouchMove, { passive: false })
    el.addEventListener("touchend", onTouchEnd, { passive: true })
    el.addEventListener("touchcancel", onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove", onTouchMove)
      el.removeEventListener("touchend", onTouchEnd)
      el.removeEventListener("touchcancel", onTouchEnd)
    }
  }, [disabled, finish, isRefreshing, maxPull, threshold])

  return {
    ref,
    pullDistance,
    isRefreshing,
    thresholdReached: pullDistance >= threshold,
  }
}
