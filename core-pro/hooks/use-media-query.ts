"use client"

import { useSyncExternalStore } from "react"

// Responsive UI hook powered by matchMedia. Uses `useSyncExternalStore` so
// the match value is read synchronously during render — no extra re-render
// on mount, no set-state-in-effect warnings, SSR-safe via `getServerSnapshot`.
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      if (typeof window === "undefined") return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener("change", notify)
      return () => mql.removeEventListener("change", notify)
    },
    () => {
      if (typeof window === "undefined") return false
      return window.matchMedia(query).matches
    },
    () => false,
  )
}
