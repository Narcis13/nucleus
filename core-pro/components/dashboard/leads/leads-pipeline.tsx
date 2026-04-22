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
import { useAction } from "next-safe-action/hooks"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/page-header"
import { moveLeadToStageAction } from "@/lib/actions/leads"
import type { Lead, LeadActivity, LeadStage } from "@/types/domain"

import { KanbanColumn } from "./kanban-column"
import { LeadCard } from "./lead-card"
import { LeadDetail } from "./lead-detail"
import { StageManager } from "./stage-manager"

// ─────────────────────────────────────────────────────────────────────────────
// <LeadsPipeline>
//
// Client container for /dashboard/leads. Holds the single source of truth for
// stages, leads, and activities. Server actions return the updated rows and
// we merge them into local state — no `revalidatePath` on this page because
// Next 16 dev's RSC streaming crashes when re-rendering during the action
// response (see project memory).
// ─────────────────────────────────────────────────────────────────────────────
export function LeadsPipeline({
  stages: initialStages,
  leads: initialLeads,
  activities: initialActivities,
}: {
  stages: LeadStage[]
  leads: Lead[]
  activities: LeadActivity[]
}) {
  const [stages, setStages] = useState<LeadStage[]>(initialStages)
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [activities, setActivities] =
    useState<LeadActivity[]>(initialActivities)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [openLeadId, setOpenLeadId] = useState<string | null>(null)

  useEffect(() => {
    setStages(initialStages)
  }, [initialStages])
  useEffect(() => {
    setLeads(initialLeads)
  }, [initialLeads])
  useEffect(() => {
    setActivities(initialActivities)
  }, [initialActivities])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const upsertLead = useCallback((lead: Lead) => {
    setLeads((prev) => {
      const idx = prev.findIndex((l) => l.id === lead.id)
      if (idx === -1) return [lead, ...prev]
      const next = prev.slice()
      next[idx] = lead
      return next
    })
  }, [])

  const upsertActivity = useCallback((activity: LeadActivity) => {
    setActivities((prev) => [activity, ...prev])
  }, [])

  const upsertStage = useCallback((stage: LeadStage) => {
    setStages((prev) => {
      const idx = prev.findIndex((s) => s.id === stage.id)
      if (idx === -1)
        return [...prev, stage].sort((a, b) => a.position - b.position)
      const next = prev.slice()
      next[idx] = stage
      return next.sort((a, b) => a.position - b.position)
    })
  }, [])

  const removeStage = useCallback((stageId: string) => {
    setStages((prev) => prev.filter((s) => s.id !== stageId))
  }, [])

  const moveAction = useAction(moveLeadToStageAction, {
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't move lead.")
      setLeads(initialLeads)
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

    const overId = String(over.id)
    let targetStageId: string | null = null
    if (overId.startsWith("stage:")) {
      targetStageId = overId.slice("stage:".length)
    } else {
      const overLead = leads.find((l) => l.id === overId)
      targetStageId = overLead?.stageId ?? null
    }
    if (!targetStageId || targetStageId === lead.stageId) return

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

  const summary = `${leads.length} ${leads.length === 1 ? "lead" : "leads"} across ${stages.length} ${stages.length === 1 ? "stage" : "stages"}.`

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Leads"
        description={summary}
        actions={
          <StageManager
            stages={stages}
            onStageUpserted={upsertStage}
            onStageRemoved={removeStage}
          />
        }
      />
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
              onLeadCreated={upsertLead}
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
        onLeadUpdated={upsertLead}
        onActivityCreated={upsertActivity}
      />
    </div>
  )
}
