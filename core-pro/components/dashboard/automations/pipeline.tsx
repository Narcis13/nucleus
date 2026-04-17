import { ArrowRight, Clock, Zap } from "lucide-react"

import type { AutomationAction } from "@/lib/automations/types"

import { ACTION_LABELS, TRIGGER_LABELS, summarizeAction } from "./shared"
import type { ReferenceData } from "./shared"

// ─────────────────────────────────────────────────────────────────────────────
// <AutomationPipeline>
//
// Left-to-right "trigger → action → wait → action" strip. Used inside both
// the list card and the builder preview. Arrows between items are rendered
// as inline icons so the row wraps cleanly on narrow screens.
// ─────────────────────────────────────────────────────────────────────────────
export function AutomationPipeline({
  triggerType,
  actions,
  lookup,
  compact = false,
}: {
  triggerType: string
  actions: AutomationAction[]
  lookup: ReferenceData
  compact?: boolean
}) {
  const triggerLabel =
    TRIGGER_LABELS[triggerType as keyof typeof TRIGGER_LABELS] ?? triggerType
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <Chip
        icon={<Zap className="size-3" />}
        tone="trigger"
        compact={compact}
      >
        {triggerLabel}
      </Chip>
      {actions.map((action, idx) => (
        <span key={idx} className="flex items-center gap-1.5">
          <ArrowRight className="size-3 text-muted-foreground" />
          <Chip
            icon={
              action.type === "wait" ? <Clock className="size-3" /> : null
            }
            tone={action.type === "wait" ? "wait" : "action"}
            compact={compact}
          >
            {summarizeAction(action, lookup)}
          </Chip>
        </span>
      ))}
      {actions.length === 0 && (
        <span className="text-muted-foreground">No actions yet</span>
      )}
    </div>
  )
}

function Chip({
  children,
  icon,
  tone,
  compact,
}: {
  children: React.ReactNode
  icon?: React.ReactNode
  tone: "trigger" | "action" | "wait"
  compact: boolean
}) {
  const toneClass =
    tone === "trigger"
      ? "bg-primary/10 text-primary border-primary/30"
      : tone === "wait"
      ? "bg-amber-500/10 text-amber-800 border-amber-500/30 dark:text-amber-300"
      : "bg-muted text-foreground border-border"
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border ${toneClass} ${
        compact ? "px-1.5 py-0.5" : "px-2 py-1"
      }`}
    >
      {icon}
      <span className="truncate">{children}</span>
    </span>
  )
}

// Small utility used by both the list card and the builder — render the human
// label for an action type with its icon. Kept here so callers stay lean.
export function ActionLabel({ type }: { type: AutomationAction["type"] }) {
  return <span>{ACTION_LABELS[type]}</span>
}
