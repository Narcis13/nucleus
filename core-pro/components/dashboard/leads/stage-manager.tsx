"use client"

import { Plus, Settings2, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAction } from "next-safe-action/hooks"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  createStageAction,
  deleteStageAction,
  updateStageAction,
} from "@/lib/actions/leads"
import type { LeadStage } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// <StageManager>
//
// Inline stage CRUD shown in a dialog from the leads page header. Lets the
// professional add new stages, rename / recolor existing ones, toggle the
// won/lost flags, and delete empty stages.
// ─────────────────────────────────────────────────────────────────────────────
export function StageManager({ stages }: { stages: LeadStage[] }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Settings2 className="size-3.5" />
            Stages
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pipeline stages</DialogTitle>
          <DialogDescription>
            Reorder, rename, recolor, or add new stages. Drag-and-drop reorder
            arrives in a later session — for now, edit the position number
            inline.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {stages.map((stage) => (
            <StageRow key={stage.id} stage={stage} />
          ))}
          <CreateStageRow />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StageRow({ stage }: { stage: LeadStage }) {
  const router = useRouter()
  const [name, setName] = useState(stage.name)
  const [color, setColor] = useState(stage.color ?? "#6366f1")
  const [isWon, setIsWon] = useState(stage.isWon)
  const [isLost, setIsLost] = useState(stage.isLost)

  const updateAction = useAction(updateStageAction, {
    onSuccess: () => {
      toast.success("Stage updated.")
      router.refresh()
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Couldn't update stage."),
  })
  const deleteAction = useAction(deleteStageAction, {
    onSuccess: () => {
      toast.success("Stage deleted.")
      router.refresh()
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Couldn't delete stage."),
  })

  const dirty =
    name !== stage.name ||
    color !== (stage.color ?? "#6366f1") ||
    isWon !== stage.isWon ||
    isLost !== stage.isLost

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          aria-label="Stage color"
          className="h-7 w-9 cursor-pointer rounded border border-border bg-transparent p-0"
        />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete stage"
          onClick={() => deleteAction.execute({ id: stage.id })}
          disabled={deleteAction.isExecuting}
        >
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      </div>
      <div className="flex items-center gap-4 pl-1 text-xs">
        <label className="flex items-center gap-1.5">
          <Checkbox
            checked={isWon}
            onCheckedChange={(v) => {
              const next = Boolean(v)
              setIsWon(next)
              if (next) setIsLost(false)
            }}
          />
          Won stage
        </label>
        <label className="flex items-center gap-1.5">
          <Checkbox
            checked={isLost}
            onCheckedChange={(v) => {
              const next = Boolean(v)
              setIsLost(next)
              if (next) setIsWon(false)
            }}
          />
          Lost stage
        </label>
        <span className="ml-auto text-muted-foreground">
          Position {stage.position}
        </span>
      </div>
      <div className="flex justify-end">
        <Button
          size="xs"
          disabled={!dirty || updateAction.isExecuting}
          onClick={() =>
            updateAction.execute({
              id: stage.id,
              name,
              color,
              isWon,
              isLost,
            })
          }
        >
          Save
        </Button>
      </div>
    </div>
  )
}

function CreateStageRow() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [color, setColor] = useState("#6366f1")
  const [isWon, setIsWon] = useState(false)
  const [isLost, setIsLost] = useState(false)

  const action = useAction(createStageAction, {
    onSuccess: () => {
      toast.success("Stage added.")
      setName("")
      setColor("#6366f1")
      setIsWon(false)
      setIsLost(false)
      router.refresh()
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Couldn't add stage."),
  })

  return (
    <form
      className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        action.execute({ name: name.trim(), color, isWon, isLost })
      }}
    >
      <Label className="text-xs text-muted-foreground">Add a stage</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          aria-label="New stage color"
          className="h-7 w-9 cursor-pointer rounded border border-border bg-transparent p-0"
        />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Stage name"
          className="flex-1"
        />
      </div>
      <div className="flex items-center gap-4 pl-1 text-xs">
        <label className="flex items-center gap-1.5">
          <Checkbox
            checked={isWon}
            onCheckedChange={(v) => {
              const next = Boolean(v)
              setIsWon(next)
              if (next) setIsLost(false)
            }}
          />
          Won stage
        </label>
        <label className="flex items-center gap-1.5">
          <Checkbox
            checked={isLost}
            onCheckedChange={(v) => {
              const next = Boolean(v)
              setIsLost(next)
              if (next) setIsWon(false)
            }}
          />
          Lost stage
        </label>
        <Button
          type="submit"
          size="xs"
          className="ml-auto"
          disabled={action.isExecuting || !name.trim()}
        >
          <Plus className="size-3" />
          Add
        </Button>
      </div>
    </form>
  )
}
