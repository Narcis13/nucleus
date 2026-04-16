"use client"

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { useRouter } from "next/navigation"
import { useAction } from "next-safe-action/hooks"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { moveLeadToStageAction } from "@/lib/actions/leads"
import type { Lead, LeadActivity, LeadStage } from "@/types/domain"

import { KanbanColumn } from "./kanban-column"
import { LeadCard } from "./lead-card"
import { LeadDetail } from "./lead-detail"

// ─────────────────────────────────────────────────────────────────────────────
// <KanbanBoard>
//
// DndContext root for the lead pipeline. Each column is its own SortableContext
// (per `@dnd-kit/sortable` recommendation for cross-list drag); we listen to
// `onDragEnd` to detect drops onto a different column and call the move
// Server Action with optimistic UI + rollback on failure.
// ─────────────────────────────────────────────────────────────────────────────

export function KanbanBoard({
  stages,
  leads: initialLeads,
  activities,
}: {
  stages: LeadStage[]
  leads: Lead[]
  activities: LeadActivity[]
}) {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [openLeadId, setOpenLeadId] = useState<string | null>(null)

  // Sync with server-provided list whenever the page revalidates.
  useEffect(() => {
    setLeads(initialLeads)
  }, [initialLeads])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const moveAction = useAction(moveLeadToStageAction, {
    onSuccess: () => {
      router.refresh()
    },
    onError: ({ error, input }) => {
      toast.error(error.serverError ?? "Couldn't move lead.")
      // Rollback by re-syncing from the server.
      setLeads(initialLeads)
      void input
    },
  })

  const leadsByStage = useMemo(() => {
    const map = new Map<string, Lead[]>()
    for (const stage of stages) map.set(stage.id, [])
    for (const lead of leads) {
      const list = map.get(lead.stageId)
      if (list) list.push(lead)
    }
    return map
  }, [stages, leads])

  const activeLead = activeId
    ? leads.find((l) => l.id === activeId) ?? null
    : null

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const activeLeadId = String(active.id)
    const lead = leads.find((l) => l.id === activeLeadId)
    if (!lead) return

    // `over.id` is either another lead's id (when hovering over a card) or a
    // column id prefixed with "stage:". Resolve to a target stage either way.
    const overId = String(over.id)
    let targetStageId: string | null = null
    if (overId.startsWith("stage:")) {
      targetStageId = overId.slice("stage:".length)
    } else {
      const overLead = leads.find((l) => l.id === overId)
      targetStageId = overLead?.stageId ?? null
    }
    if (!targetStageId || targetStageId === lead.stageId) return

    // Optimistic update.
    setLeads((prev) =>
      prev.map((l) =>
        l.id === activeLeadId ? { ...l, stageId: targetStageId! } : l,
      ),
    )
    moveAction.execute({ leadId: activeLeadId, stageId: targetStageId })
  }

  const openLead = openLeadId
    ? leads.find((l) => l.id === openLeadId) ?? null
    : null
  const openLeadActivities = openLead
    ? activities.filter((a) => a.leadId === openLead.id)
    : []

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex w-full gap-3 overflow-x-auto pb-3">
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              leads={leadsByStage.get(stage.id) ?? []}
              onLeadClick={(id) => setOpenLeadId(id)}
            />
          ))}
        </div>
        <DragOverlay>
          {activeLead ? (
            <LeadCard lead={activeLead} dragging onClick={() => {}} />
          ) : null}
        </DragOverlay>
      </DndContext>
      <LeadDetail
        lead={openLead}
        stages={stages}
        activities={openLeadActivities}
        open={Boolean(openLead)}
        onOpenChange={(open) => {
          if (!open) setOpenLeadId(null)
        }}
      />
    </>
  )
}
