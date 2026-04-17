"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import type { Route } from "next"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

import { RANGE_PRESETS, type RangePreset } from "@/lib/analytics/queries"

// Syncs the chosen range to ?range= / ?from= / ?to= so server components can
// read it directly. Kept out of the form-control pattern — a change to the
// Select navigates immediately.
export function DateRangeSelector({
  preset,
  from,
  to,
}: {
  preset: RangePreset
  from?: string
  to?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  function push(next: URLSearchParams) {
    const qs = next.toString()
    startTransition(() => {
      router.replace(`${pathname}${qs ? `?${qs}` : ""}` as Route)
    })
  }

  function updatePreset(value: RangePreset | null) {
    if (!value) return
    const next = new URLSearchParams(params)
    next.set("range", value)
    if (value !== "custom") {
      next.delete("from")
      next.delete("to")
    }
    push(next)
  }

  function updateFrom(value: string) {
    const next = new URLSearchParams(params)
    next.set("range", "custom")
    if (value) next.set("from", value)
    else next.delete("from")
    push(next)
  }

  function updateTo(value: string) {
    const next = new URLSearchParams(params)
    next.set("range", "custom")
    if (value) next.set("to", value)
    else next.delete("to")
    push(next)
  }

  return (
    <div
      className="flex flex-wrap items-end gap-3"
      data-pending={pending ? "" : undefined}
    >
      <div className="flex flex-col gap-1">
        <Label className="text-[11px] uppercase text-muted-foreground">
          Range
        </Label>
        <Select value={preset} onValueChange={updatePreset}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {preset === "custom" && (
        <>
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] uppercase text-muted-foreground">
              From
            </Label>
            <Input
              type="date"
              value={from ?? ""}
              onChange={(e) => updateFrom(e.target.value)}
              className="w-[170px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] uppercase text-muted-foreground">
              To
            </Label>
            <Input
              type="date"
              value={to ?? ""}
              onChange={(e) => updateTo(e.target.value)}
              className="w-[170px]"
            />
          </div>
        </>
      )}
    </div>
  )
}
