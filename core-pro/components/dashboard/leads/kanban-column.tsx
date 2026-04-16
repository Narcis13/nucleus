"use client"

import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Plus } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { createLeadAction } from "@/lib/actions/leads"
import type { Lead, LeadStage } from "@/types/domain"

import { LeadCard } from "./lead-card"

// ─────────────────────────────────────────────────────────────────────────────
// <KanbanColumn>
//
// One column per lead stage. Wraps its lead cards in a SortableContext using
// the vertical list strategy. The column itself is a Droppable so empty
// columns can still receive a drop from another column.
// ─────────────────────────────────────────────────────────────────────────────
export function KanbanColumn({
  stage,
  leads,
  onLeadClick,
}: {
  stage: LeadStage
  leads: Lead[]
  onLeadClick: (id: string) => void
}) {
  const droppableId = `stage:${stage.id}`
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })

  return (
    <div
      ref={setNodeRef}
      className={
        "flex h-full w-72 shrink-0 flex-col rounded-lg border bg-muted/30 transition-colors " +
        (isOver ? "border-primary/60 bg-muted/60" : "border-border")
      }
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{
              backgroundColor: stage.color ?? "#6366f1",
            }}
          />
          <p className="truncate text-sm font-medium text-foreground">
            {stage.name}
          </p>
          <span className="text-xs text-muted-foreground">{leads.length}</span>
        </div>
        <QuickAddPopover stageId={stage.id} />
      </header>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2 min-h-32">
        <SortableContext
          id={droppableId}
          items={leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {leads.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              Drop a lead here.
            </p>
          ) : (
            leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onClick={() => onLeadClick(lead.id)}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  )
}

function QuickAddPopover({ stageId }: { stageId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [source, setSource] = useState("")

  const action = useAction(createLeadAction, {
    onSuccess: () => {
      toast.success("Lead added.")
      setFullName("")
      setEmail("")
      setPhone("")
      setSource("")
      setOpen(false)
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't add lead.")
    },
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Add lead to stage`}
          >
            <Plus className="size-3.5" />
          </Button>
        }
      />
      <PopoverContent align="end" className="w-72">
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!fullName.trim()) return
            action.execute({
              fullName: fullName.trim(),
              email: email.trim(),
              phone: phone.trim(),
              source: source.trim(),
              stageId,
            })
          }}
        >
          <p className="text-xs font-medium text-muted-foreground">
            Quick add lead
          </p>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name *"
            autoFocus
          />
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
          />
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
          />
          <Input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Source (referral, web…)"
          />
          <Button type="submit" size="sm" disabled={action.isExecuting}>
            {action.isExecuting ? "Adding…" : "Add lead"}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}
