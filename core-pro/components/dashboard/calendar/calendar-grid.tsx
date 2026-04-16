"use client"

import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAction } from "next-safe-action/hooks"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  AppointmentForm,
  type ClientChoice,
  type ServiceChoice,
} from "@/components/dashboard/calendar/appointment-form"
import { AvailabilityEditor } from "@/components/dashboard/calendar/availability-editor"
import { updateAppointmentAction } from "@/lib/actions/appointments"
import { cn } from "@/lib/utils"
import type { Appointment, AvailabilitySlot } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// <CalendarGrid>
//
// Day/week view of appointments. The month view is a simple grid that links
// each day to its day view. We render hours as a fixed 24-row grid and
// position events absolutely by their start/end-relative-to-midnight offsets.
//
// Drag to reschedule: each appointment block is a draggable; each hour cell
// is a droppable. On drop we keep the duration constant and PATCH startAt.
// ─────────────────────────────────────────────────────────────────────────────

export type CalendarEvent = {
  id: string
  title: string
  startAt: Date
  endAt: Date
  status: string
  type: string
  clientName: string | null
  appointment: Appointment
}

type View = "day" | "week" | "month"

const HOUR_HEIGHT = 48 // px
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function CalendarGrid({
  events: initialEvents,
  availability,
  bufferMinutes,
  clients,
  services,
}: {
  events: CalendarEvent[]
  availability: AvailabilitySlot[]
  bufferMinutes: number
  clients: ClientChoice[]
  services: ServiceChoice[]
}) {
  const router = useRouter()
  const [view, setView] = useState<View>("week")
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()))
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creatingAt, setCreatingAt] = useState<Date | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Sync when the parent re-renders with fresh server data.
  useEffect(() => {
    setEvents(initialEvents)
  }, [initialEvents])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  )

  const update = useAction(updateAppointmentAction, {
    onSuccess: () => router.refresh(),
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't reschedule.")
      setEvents(initialEvents)
    },
  })

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const overId = String(over.id)
    if (!overId.startsWith("cell:")) return
    const [, dateIso, hourStr] = overId.split(":")
    if (!dateIso || hourStr === undefined) return
    const targetHour = Number(hourStr)
    const ev = events.find((e) => e.id === String(active.id))
    if (!ev) return

    const duration = ev.endAt.getTime() - ev.startAt.getTime()
    const newStart = new Date(dateIso)
    newStart.setHours(targetHour, 0, 0, 0)
    const newEnd = new Date(newStart.getTime() + duration)

    setEvents((prev) =>
      prev.map((e) =>
        e.id === ev.id ? { ...e, startAt: newStart, endAt: newEnd } : e,
      ),
    )
    update.execute({
      id: ev.id,
      startAt: newStart.toISOString(),
      endAt: newEnd.toISOString(),
    })
  }

  const visibleDays = useMemo(() => {
    if (view === "day") return [anchor]
    if (view === "week") {
      return Array.from({ length: 7 }, (_, i) => addDays(anchor, i))
    }
    return monthDays(anchor)
  }, [view, anchor])

  const editing = editingId
    ? events.find((e) => e.id === editingId)?.appointment ?? null
    : null

  const onCreate = (at?: Date) => {
    setEditingId(null)
    setCreatingAt(at ?? null)
    setDialogOpen(true)
  }

  const onEdit = (id: string) => {
    setEditingId(id)
    setCreatingAt(null)
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setAnchor((a) => shift(a, view, -1))}
          >
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setAnchor((a) => shift(a, view, 1))}
          >
            <ChevronRight />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setAnchor(
                view === "week"
                  ? startOfWeek(new Date())
                  : view === "month"
                    ? startOfMonth(new Date())
                    : new Date(),
              )
            }
          >
            Today
          </Button>
          <p className="ml-3 text-sm font-medium text-foreground">
            {periodLabel(anchor, view)}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {(["day", "week", "month"] as const).map((v) => (
            <Button
              key={v}
              type="button"
              variant={view === v ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setView(v)
                if (v === "month") setAnchor(startOfMonth(anchor))
                if (v === "week") setAnchor(startOfWeek(anchor))
              }}
            >
              {v[0]!.toUpperCase() + v.slice(1)}
            </Button>
          ))}
          <AvailabilityEditor
            initialSlots={availability}
            initialBufferMinutes={bufferMinutes}
          />
          <Button
            type="button"
            size="sm"
            onClick={() => onCreate()}
          >
            <Plus />
            New
          </Button>
        </div>
      </div>

      {/* Grid */}
      {view === "month" ? (
        <MonthView days={visibleDays} events={events} onClick={onCreate} />
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <TimeGrid
            days={visibleDays}
            events={events}
            onEditEvent={onEdit}
            onCreateAt={onCreate}
          />
        </DndContext>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit appointment" : "New appointment"}
            </DialogTitle>
          </DialogHeader>
          <AppointmentForm
            initial={editing}
            defaultStart={creatingAt}
            clients={clients}
            services={services}
            onDone={() => {
              setDialogOpen(false)
              router.refresh()
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Time grid (day + week)
// ─────────────────────────────────────────────────────────────────────────────
function TimeGrid({
  days,
  events,
  onEditEvent,
  onCreateAt,
}: {
  days: Date[]
  events: CalendarEvent[]
  onEditEvent: (id: string) => void
  onCreateAt: (at: Date) => void
}) {
  const hours = Array.from({ length: 24 }, (_, h) => h)
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-background">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `48px repeat(${days.length}, minmax(120px, 1fr))`,
        }}
      >
        <div /> {/* corner */}
        {days.map((d) => (
          <div
            key={d.toDateString()}
            className={cn(
              "border-b border-l border-border px-2 py-1.5 text-center",
              isToday(d) && "bg-muted/50",
            )}
          >
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {DAY_LABELS[d.getDay()]}
            </p>
            <p
              className={cn(
                "text-base font-semibold text-foreground",
                isToday(d) && "text-primary",
              )}
            >
              {d.getDate()}
            </p>
          </div>
        ))}

        {hours.map((h) => (
          <HourRow
            key={h}
            hour={h}
            days={days}
            events={events}
            onEditEvent={onEditEvent}
            onCreateAt={onCreateAt}
          />
        ))}
      </div>
    </div>
  )
}

function HourRow({
  hour,
  days,
  events,
  onEditEvent,
  onCreateAt,
}: {
  hour: number
  days: Date[]
  events: CalendarEvent[]
  onEditEvent: (id: string) => void
  onCreateAt: (at: Date) => void
}) {
  return (
    <>
      <div
        className="border-t border-border pr-1 text-right text-[10px] text-muted-foreground"
        style={{ height: HOUR_HEIGHT }}
      >
        {hour.toString().padStart(2, "0")}:00
      </div>
      {days.map((day) => (
        <DayHourCell
          key={`${day.toDateString()}-${hour}`}
          day={day}
          hour={hour}
          events={events}
          onEditEvent={onEditEvent}
          onCreateAt={onCreateAt}
        />
      ))}
    </>
  )
}

function DayHourCell({
  day,
  hour,
  events,
  onEditEvent,
  onCreateAt,
}: {
  day: Date
  hour: number
  events: CalendarEvent[]
  onEditEvent: (id: string) => void
  onCreateAt: (at: Date) => void
}) {
  const id = `cell:${day.toISOString()}:${hour}`
  const { setNodeRef, isOver } = useDroppable({ id })

  // Only render events whose START hour matches this cell — avoids dupes
  // across rows. The block's height covers its true duration.
  const eventsHere = events.filter((e) => {
    const sameDay =
      e.startAt.getDate() === day.getDate() &&
      e.startAt.getMonth() === day.getMonth() &&
      e.startAt.getFullYear() === day.getFullYear()
    return sameDay && e.startAt.getHours() === hour
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative border-t border-l border-border",
        isOver && "bg-muted/40",
      )}
      style={{ height: HOUR_HEIGHT }}
      onDoubleClick={() => {
        const at = new Date(day)
        at.setHours(hour, 0, 0, 0)
        onCreateAt(at)
      }}
    >
      {eventsHere.map((e) => (
        <EventBlock key={e.id} event={e} onClick={() => onEditEvent(e.id)} />
      ))}
    </div>
  )
}

function EventBlock({
  event,
  onClick,
}: {
  event: CalendarEvent
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: event.id })

  const startMinutes =
    event.startAt.getHours() * 60 + event.startAt.getMinutes()
  const endMinutes = event.endAt.getHours() * 60 + event.endAt.getMinutes()
  const cellTopMinutes = event.startAt.getHours() * 60
  const top = ((startMinutes - cellTopMinutes) / 60) * HOUR_HEIGHT
  const height = Math.max(
    16,
    ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT - 2,
  )

  const palette = colorFor(event.status, event.type)

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        if (!isDragging) onClick()
      }}
      style={{
        top,
        height,
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
      }}
      className={cn(
        "absolute inset-x-0.5 z-10 overflow-hidden rounded-md border px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm transition-colors",
        palette,
        isDragging && "opacity-70",
      )}
    >
      <p className="truncate font-medium">{event.title}</p>
      <p className="truncate opacity-80">
        {fmtTime(event.startAt)} · {event.clientName ?? "—"}
      </p>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Month view
// ─────────────────────────────────────────────────────────────────────────────
function MonthView({
  days,
  events,
  onClick,
}: {
  days: Date[]
  events: CalendarEvent[]
  onClick: (at: Date) => void
}) {
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of events) {
      const k = startOfDay(e.startAt).toDateString()
      const list = map.get(k) ?? []
      list.push(e)
      map.set(k, list)
    }
    return map
  }, [events])

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="grid grid-cols-7 border-b border-border text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {DAY_LABELS.map((d) => (
          <div key={d} className="py-1.5">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const list = eventsByDay.get(d.toDateString()) ?? []
          return (
            <div
              key={d.toISOString()}
              onDoubleClick={() => {
                const at = new Date(d)
                at.setHours(9, 0, 0, 0)
                onClick(at)
              }}
              className={cn(
                "min-h-24 border-t border-l border-border p-1",
                isToday(d) && "bg-muted/40",
              )}
            >
              <p
                className={cn(
                  "text-xs font-medium text-foreground",
                  isToday(d) && "text-primary",
                )}
              >
                {d.getDate()}
              </p>
              <div className="mt-1 space-y-0.5">
                {list.slice(0, 3).map((e) => (
                  <p
                    key={e.id}
                    className={cn(
                      "truncate rounded px-1 py-0.5 text-[10px]",
                      colorFor(e.status, e.type),
                    )}
                  >
                    {fmtTime(e.startAt)} {e.title}
                  </p>
                ))}
                {list.length > 3 && (
                  <p className="text-[10px] text-muted-foreground">
                    +{list.length - 3} more
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  x.setDate(x.getDate() - x.getDay())
  return x
}
function startOfMonth(d: Date): Date {
  const x = startOfDay(d)
  x.setDate(1)
  return x
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
function shift(d: Date, view: View, dir: number): Date {
  if (view === "day") return addDays(d, dir)
  if (view === "week") return addDays(d, dir * 7)
  const x = new Date(d)
  x.setMonth(x.getMonth() + dir)
  return startOfMonth(x)
}
function monthDays(anchor: Date): Date[] {
  const start = startOfMonth(anchor)
  const gridStart = startOfWeek(start)
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
}
function isToday(d: Date): boolean {
  const t = new Date()
  return (
    d.getDate() === t.getDate() &&
    d.getMonth() === t.getMonth() &&
    d.getFullYear() === t.getFullYear()
  )
}
function fmtTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
}
function periodLabel(d: Date, view: View): string {
  if (view === "day")
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  if (view === "week") {
    const end = addDays(d, 6)
    return `${d.toLocaleDateString(undefined, { day: "2-digit", month: "short" })} – ${end.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}`
  }
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" })
}
function colorFor(status: string, type: string): string {
  if (status === "cancelled")
    return "bg-muted/60 text-muted-foreground border-border line-through"
  if (status === "pending")
    return "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-900/50"
  if (status === "confirmed")
    return "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-900/50"
  if (status === "completed")
    return "bg-slate-100 text-slate-900 border-slate-200 dark:bg-slate-900/30 dark:text-slate-200 dark:border-slate-900/50"
  if (type === "virtual")
    return "bg-violet-100 text-violet-900 border-violet-200 dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-900/50"
  return "bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-900/30 dark:text-sky-200 dark:border-sky-900/50"
}
