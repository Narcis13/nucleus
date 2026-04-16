import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// <StatCard>
//
// The four-up metrics strip on the invoices dashboard. Lightweight wrapper
// around the shared card surface so the invoice page doesn't re-invent
// copy-of-card-with-coloured-accent five times.
// ─────────────────────────────────────────────────────────────────────────────

export type StatCardColor = "blue" | "green" | "yellow" | "red" | "slate"

type StatCardProps = {
  label: string
  value: string
  caption?: string
  icon?: LucideIcon
  color?: StatCardColor
}

const COLOR_CLASSES: Record<
  StatCardColor,
  { ring: string; badge: string; icon: string }
> = {
  blue: {
    ring: "ring-blue-500/10",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
    icon: "text-blue-500",
  },
  green: {
    ring: "ring-emerald-500/10",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    icon: "text-emerald-500",
  },
  yellow: {
    ring: "ring-amber-500/10",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    icon: "text-amber-500",
  },
  red: {
    ring: "ring-red-500/10",
    badge: "bg-red-500/10 text-red-600 dark:text-red-300",
    icon: "text-red-500",
  },
  slate: {
    ring: "ring-slate-500/10",
    badge: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
    icon: "text-slate-500",
  },
}

export function StatCard({
  label,
  value,
  caption,
  icon: Icon,
  color = "slate",
}: StatCardProps) {
  const c = COLOR_CLASSES[color]
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-border bg-card p-4 ring-1",
        c.ring,
      )}
    >
      {Icon && (
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md",
            c.badge,
          )}
        >
          <Icon className={cn("size-4", c.icon)} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 font-heading text-xl font-semibold text-foreground">
          {value}
        </p>
        {caption && (
          <p className="mt-0.5 text-xs text-muted-foreground">{caption}</p>
        )}
      </div>
    </div>
  )
}
