import {
  Calendar,
  FileText,
  FormInput,
  MessageSquare,
  Receipt,
  UserCog,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { ActivityEntry } from "@/lib/db/queries/clients"

// ─────────────────────────────────────────────────────────────────────────────
// <ActivityTimeline>
//
// Chronological feed of per-client activity. Entries are pre-aggregated by the
// `getClientActivity` query, so this component just renders the list.
// ─────────────────────────────────────────────────────────────────────────────
const ICONS = {
  document: FileText,
  invoice: Receipt,
  form: FormInput,
  message: MessageSquare,
  appointment: Calendar,
  relationship: UserCog,
} as const

export function ActivityTimeline({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No activity yet. Uploads, messages, and appointments will show up here.
      </p>
    )
  }
  return (
    <ol className="flex flex-col gap-3">
      {entries.map((e) => {
        const Icon = ICONS[e.type]
        return (
          <li
            key={e.id}
            className={cn(
              "flex gap-3 rounded-md border border-border bg-card p-3",
            )}
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                {e.title}
              </p>
              {e.description && (
                <p className="truncate text-xs text-muted-foreground">
                  {e.description}
                </p>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">
                {e.occurredAt.toLocaleString()}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
