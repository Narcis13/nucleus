"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Mail, Phone, Star } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { Lead } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// <LeadCard>
//
// One draggable lead card. `useSortable` gives us listeners + a transform; we
// apply them to the outer button. Click bubbles up to open the detail panel
// — pointer activation distance on the sensor (4px) prevents accidental drag
// on small mouse jitters.
// ─────────────────────────────────────────────────────────────────────────────
export function LeadCard({
  lead,
  onClick,
  dragging = false,
}: {
  lead: Lead
  onClick: () => void
  dragging?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const initials = lead.fullName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          if (!e.defaultPrevented) {
            e.preventDefault()
            onClick()
          }
        }
      }}
      role="button"
      tabIndex={0}
      className={
        "group flex cursor-grab flex-col gap-2 rounded-md border border-border bg-card p-3 text-left text-sm shadow-xs transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing " +
        (dragging ? "rotate-2 shadow-lg" : "")
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
            {initials || "?"}
          </div>
          <p className="truncate font-medium text-foreground">
            {lead.fullName}
          </p>
        </div>
        {lead.score > 0 && (
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Star className="size-3" />
            {lead.score}
          </Badge>
        )}
      </div>
      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        {lead.email && (
          <p className="flex items-center gap-1.5 truncate">
            <Mail className="size-3" />
            {lead.email}
          </p>
        )}
        {lead.phone && (
          <p className="flex items-center gap-1.5 truncate">
            <Phone className="size-3" />
            {lead.phone}
          </p>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        {lead.source ? (
          <Badge variant="secondary" className="text-[10px]">
            {lead.source}
          </Badge>
        ) : (
          <span />
        )}
        <span>
          {new Date(lead.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
    </div>
  )
}
