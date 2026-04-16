"use client"

import { Plus, Settings2, Trash2 } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { saveAvailabilityAction } from "@/lib/actions/appointments"
import type { AvailabilitySlot } from "@/types/domain"

// Weekly availability editor — opens in a Dialog from the calendar page.
// Stores 0–6 day rows (Sun–Sat). Each day can have N windows; togglable.
//
// Submission shape mirrors the server schema in `saveAvailabilityAction` —
// we send the full set every time so the server can replace atomically.

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

type EditorRow = {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isActive: boolean
}

function rowId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function AvailabilityEditor({
  initialSlots,
  initialBufferMinutes,
}: {
  initialSlots: AvailabilitySlot[]
  initialBufferMinutes: number
}) {
  const [open, setOpen] = useState(false)
  const [bufferMinutes, setBufferMinutes] = useState(initialBufferMinutes)
  const [rows, setRows] = useState<EditorRow[]>(() =>
    initialSlots.length > 0
      ? initialSlots.map((s) => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime.slice(0, 5),
          endTime: s.endTime.slice(0, 5),
          isActive: s.isActive,
        }))
      : defaultRows(),
  )

  const action = useAction(saveAvailabilityAction, {
    onSuccess: () => {
      toast.success("Availability saved.")
      setOpen(false)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't save availability.")
    },
  })

  const onSave = () => {
    action.execute({
      bufferMinutes,
      slots: rows.map((r) => ({
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
        isActive: r.isActive,
      })),
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Settings2 />
            Availability
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Weekly availability</DialogTitle>
          <DialogDescription>
            Set the recurring windows when clients can book you. Toggle a row
            off to skip that day temporarily.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {DAYS.map((dayLabel, dow) => {
            const dayRows = rows
              .map((r, idx) => ({ ...r, idx }))
              .filter((r) => r.dayOfWeek === dow)
            return (
              <div
                key={dayLabel}
                className="rounded-lg border border-border p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">
                    {dayLabel}
                  </p>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={() =>
                      setRows((prev) => [
                        ...prev,
                        {
                          id: rowId(),
                          dayOfWeek: dow,
                          startTime: "09:00",
                          endTime: "17:00",
                          isActive: true,
                        },
                      ])
                    }
                  >
                    <Plus />
                    Add window
                  </Button>
                </div>
                {dayRows.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    No windows — clients won&apos;t be able to book on {dayLabel}.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {dayRows.map((r) => (
                      <div key={r.id} className="flex items-center gap-2">
                        <Switch
                          checked={r.isActive}
                          onCheckedChange={(checked) =>
                            setRows((prev) =>
                              prev.map((x) =>
                                x.id === r.id
                                  ? { ...x, isActive: Boolean(checked) }
                                  : x,
                              ),
                            )
                          }
                        />
                        <Input
                          type="time"
                          value={r.startTime}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((x) =>
                                x.id === r.id
                                  ? { ...x, startTime: e.target.value }
                                  : x,
                              ),
                            )
                          }
                          className="h-8 w-28"
                        />
                        <span className="text-xs text-muted-foreground">→</span>
                        <Input
                          type="time"
                          value={r.endTime}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((x) =>
                                x.id === r.id
                                  ? { ...x, endTime: e.target.value }
                                  : x,
                              ),
                            )
                          }
                          className="h-8 w-28"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="ml-auto"
                          onClick={() =>
                            setRows((prev) => prev.filter((x) => x.id !== r.id))
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          <div className="rounded-lg border border-border p-3">
            <p className="text-sm font-medium text-foreground">
              Buffer between appointments
            </p>
            <p className="text-xs text-muted-foreground">
              Minutes of breathing room added before/after every booking.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={240}
                step={5}
                value={bufferMinutes}
                onChange={(e) =>
                  setBufferMinutes(Math.max(0, Number(e.target.value || 0)))
                }
                className="h-8 w-24"
              />
              <span className="text-xs text-muted-foreground">minutes</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={action.isExecuting}
            onClick={onSave}
          >
            {action.isExecuting ? "Saving…" : "Save availability"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function defaultRows(): EditorRow[] {
  // Mon–Fri 9–5 by default — the most common starting point.
  return [1, 2, 3, 4, 5].map((dow) => ({
    id: rowId(),
    dayOfWeek: dow,
    startTime: "09:00",
    endTime: "17:00",
    isActive: true,
  }))
}
