"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

// ─────────────────────────────────────────────────────────────────────────────
// Breadcrumb overrides
//
// The <Breadcrumbs> component derives labels from the pathname. For opaque id
// segments (uuids, slugs) that's useless — e.g. "…/forms/001e68db…/edit". A
// page can register a nicer label for a segment via <SetBreadcrumbLabel>, and
// the breadcrumb swaps the id out for the registered label.
//
// Two contexts on purpose: the reader (overrides) changes whenever a label is
// registered, but the setters must be stable so <SetBreadcrumbLabel>'s effect
// doesn't re-run on every override change (that would create a register →
// cleanup → re-register loop and hit React's update-depth limit).
// ─────────────────────────────────────────────────────────────────────────────
type Overrides = Record<string, string>

type Setters = {
  setOverride: (segment: string, label: string) => void
  clearOverride: (segment: string) => void
}

const OverridesContext = createContext<Overrides>({})
const SettersContext = createContext<Setters | null>(null)

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Overrides>({})

  // Stable setters — no deps, so identity never changes.
  const setters = useMemo<Setters>(
    () => ({
      setOverride: (segment, label) =>
        setOverrides((prev) =>
          prev[segment] === label ? prev : { ...prev, [segment]: label },
        ),
      clearOverride: (segment) =>
        setOverrides((prev) => {
          if (!(segment in prev)) return prev
          const { [segment]: _removed, ...rest } = prev
          return rest
        }),
    }),
    [],
  )

  return (
    <SettersContext.Provider value={setters}>
      <OverridesContext.Provider value={overrides}>
        {children}
      </OverridesContext.Provider>
    </SettersContext.Provider>
  )
}

export function useBreadcrumbOverrides(): Overrides {
  return useContext(OverridesContext)
}

export function SetBreadcrumbLabel({
  segment,
  label,
}: {
  segment: string
  label: string
}) {
  const setters = useContext(SettersContext)
  useEffect(() => {
    if (!setters || !label) return
    setters.setOverride(segment, label)
    return () => setters.clearOverride(segment)
  }, [setters, segment, label])
  return null
}
