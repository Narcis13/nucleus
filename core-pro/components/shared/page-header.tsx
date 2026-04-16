import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// <PageHeader>
//
// The standard top strip for every dashboard / portal page. Used instead of
// repeating an <h1>/description/button row across 20+ pages. Renders as a
// server component by default; actions (usually buttons or dialogs) are
// passed in as `children` or the `actions` slot so client interactivity
// lives where it belongs — inside the action node itself.
// ─────────────────────────────────────────────────────────────────────────────
export type PageHeaderProps = {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  )
}

// Generic empty state for placeholder pages. Lets a "Coming soon" card reuse
// the same layout as real empty states (e.g. "No clients yet — add one").
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-h-[40vh] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground [&>svg]:size-5">
          {icon}
        </div>
      )}
      <p className="font-heading text-base font-medium text-foreground">
        {title}
      </p>
      {description && (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
