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
import { AlertTriangle, ChevronLeft, ChevronRight, Plus } from "lucide-react"
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
  type AppointmentFormResult,
  type ClientChoice,
  type ServiceChoice,
} from "@/components/dashboard/calendar/appointment-form"
import { AvailabilityEditor } from "@/components/dashboard/calendar/availability-editor"
import { rescheduleAppointmentAction } from "@/lib/actions/appointments"
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
const DAY_LABELS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]
const MONTH_LABELS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]
const MONTH_LABELS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

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
  const [view, setView] = useState<View>("week")
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()))
  const [events, setEvents] = useState<CalendarEvent[]>(() =>
    initialEvents.map(normalizeEvent),
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creatingAt, setCreatingAt] = useState<Date | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  // @dnd-kit uses a module-global id counter that survives client-side
  // navigation but resets on SSR, which produces a hydration mismatch on
  // repeat visits. Gate DndContext on a post-mount flag so the client always
  // renders it fresh after hydration.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Re-seed from the server prop whenever it changes (form save / cancel
  // calls revalidatePath and this prop updates). The reschedule action
  // deliberately skips `revalidatePath` to avoid a Next 16 RSC chunk-map race
  // on rapid-fire drags, so in that path `initialEvents` is stable and this
  // effect is a no-op.
  useEffect(() => {
    setEvents(initialEvents.map(normalizeEvent))
  }, [initialEvents])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  )

  const reschedule = useAction(rescheduleAppointmentAction, {
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't reschedule.")
      setEvents(initialEvents.map(normalizeEvent))
    },
  })

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const overId = String(over.id)
    if (!overId.startsWith("cell:")) return
    const [, dayMsStr, hourStr] = overId.split(":")
    if (!dayMsStr || hourStr === undefined) return
    const dayMs = Number(dayMsStr)
    const targetHour = Number(hourStr)
    if (!Number.isFinite(dayMs) || !Number.isFinite(targetHour)) return
    const ev = events.find((e) => e.id === String(active.id))
    if (!ev) return

    // Defensive: RSC can hand us Dates or ISO strings depending on the
    // revalidation path. Normalize to ms so arithmetic never yields NaN.
    const startMs = toMs(ev.startAt)
    const endMs = toMs(ev.endAt)
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return
    const duration = endMs - startMs

    const newStart = new Date(dayMs)
    newStart.setHours(targetHour, 0, 0, 0)
    const newStartMs = newStart.getTime()
    if (!Number.isFinite(newStartMs)) return
    const newEnd = new Date(newStartMs + duration)
    if (!Number.isFinite(newEnd.getTime())) return

    setEvents((prev) =>
      prev.map((e) =>
        e.id === ev.id
          ? {
              ...e,
              startAt: newStart,
              endAt: newEnd,
              // Keep the nested appointment snapshot in sync so that opening
              // the edit dialog immediately after a drag shows the new time,
              // not the stale pre-drag value.
              appointment: {
                ...e.appointment,
                startAt: newStart,
                endAt: newEnd,
              },
            }
          : e,
      ),
    )
    if (!isRangeWithinAvailability(newStart, newEnd, availability)) {
      toast.warning("Scheduled outside your weekly availability.")
    }
    reschedule.execute({
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

  const applyResult = (result: AppointmentFormResult) => {
    if (result.kind === "closed") return
    const appt = result.appointment
    const clientName =
      (appt.clientId &&
        clients.find((c) => c.id === appt.clientId)?.fullName) ||
      null
    const next: CalendarEvent = {
      id: appt.id,
      title: appt.title,
      startAt: new Date(appt.startAt),
      endAt: new Date(appt.endAt),
      status: appt.status,
      type: appt.type,
      clientName,
      appointment: appt,
    }
    setEvents((prev) => {
      const idx = prev.findIndex((e) => e.id === appt.id)
      if (idx === -1) return [...prev, next]
      const copy = prev.slice()
      copy[idx] = next
      return copy
    })
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
            aria-label="Previous period"
            onClick={() => setAnchor((a) => shift(a, view, -1))}
          >
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Next period"
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
                // Snap the anchor to something sensible for the new view. For
                // Day view we jump to today if the current anchor is outside
                // the visible window — e.g. coming from Month view (anchored
                // to the 1st) would otherwise leave the user on an empty day.
                if (v === "month") setAnchor(startOfMonth(anchor))
                if (v === "week") setAnchor(startOfWeek(anchor))
                if (v === "day" && !isInCurrentWeek(anchor))
                  setAnchor(startOfDay(new Date()))
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
      ) : mounted ? (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <TimeGrid
            days={visibleDays}
            events={events}
            availability={availability}
            onEditEvent={onEdit}
            onCreateAt={onCreate}
          />
        </DndContext>
      ) : (
        <TimeGrid
          days={visibleDays}
          events={events}
          availability={availability}
          onEditEvent={onEdit}
          onCreateAt={onCreate}
        />
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
            availability={availability}
            onDone={(result) => {
              setDialogOpen(false)
              // Create/update/cancel actions deliberately do NOT call
              // `revalidatePath` to avoid a Next 16 RSC chunk-map race that
              // crashes the page (initializeDebugInfo / enqueueModel). They
              // return the full appointment instead — we merge it locally.
              applyResult(result)
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
  availability,
  onEditEvent,
  onCreateAt,
}: {
  days: Date[]
  events: CalendarEvent[]
  availability: AvailabilitySlot[]
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

        {/* Time axis — a single column that stacks 24 hour labels. Sits in the
            same grid row as every day column below, so the row height is
            governed by HOUR_HEIGHT * 24 and labels stay aligned with cells. */}
        <div className="flex flex-col">
          {hours.map((h) => (
            <div
              key={h}
              className="border-t border-border pr-1 text-right text-[10px] text-muted-foreground"
              style={{ height: HOUR_HEIGHT }}
            >
              {pad2(h)}:00
            </div>
          ))}
        </div>
        {days.map((d) => (
          <DayColumn
            key={d.toDateString()}
            day={d}
            hours={hours}
            availability={availability}
            events={events.filter(
              (e) =>
                e.startAt.getDate() === d.getDate() &&
                e.startAt.getMonth() === d.getMonth() &&
                e.startAt.getFullYear() === d.getFullYear(),
            )}
            onEditEvent={onEditEvent}
            onCreateAt={onCreateAt}
          />
        ))}
      </div>
    </div>
  )
}

// One column per day: a relatively-positioned stack of 24 droppable hour
// cells with events layered on top. Positioning events at the column level
// (not per cell) lets a multi-hour event span the right number of cells
// naturally, and a 1-hour event fill exactly one — no accidental overflow.
function DayColumn({
  day,
  hours,
  availability,
  events,
  onEditEvent,
  onCreateAt,
}: {
  day: Date
  hours: number[]
  availability: AvailabilitySlot[]
  events: CalendarEvent[]
  onEditEvent: (id: string) => void
  onCreateAt: (at: Date) => void
}) {
  const windows = useMemo(
    () => activeWindowsForDay(availability, day.getDay()),
    [availability, day],
  )
  return (
    <div className="relative">
      {hours.map((h) => (
        <DayHourCell
          key={h}
          day={day}
          hour={h}
          windows={windows}
          onCreateAt={onCreateAt}
        />
      ))}
      {events.map((e) => (
        <EventBlock
          key={e.id}
          event={e}
          windows={windows}
          onClick={() => onEditEvent(e.id)}
        />
      ))}
    </div>
  )
}

function DayHourCell({
  day,
  hour,
  windows,
  onCreateAt,
}: {
  day: Date
  hour: number
  windows: DayWindow[]
  onCreateAt: (at: Date) => void
}) {
  const id = `cell:${day.getTime()}:${hour}`
  const { setNodeRef, isOver } = useDroppable({ id })

  const cellStartMin = hour * 60
  const cellEndMin = cellStartMin + 60
  const overlap = windows.some(
    (w) => w.startMin < cellEndMin && w.endMin > cellStartMin,
  )

  return (
    <div
      ref={setNodeRef}
      aria-label={
        overlap ? undefined : "Outside your weekly availability"
      }
      className={cn(
        "border-t border-l border-border",
        !overlap && "bg-muted/70",
        isOver && "bg-muted",
      )}
      style={{
        height: HOUR_HEIGHT,
        backgroundImage: overlap
          ? undefined
          : "repeating-linear-gradient(-45deg, transparent 0, transparent 6px, rgba(0,0,0,0.08) 6px, rgba(0,0,0,0.08) 12px)",
      }}
      onDoubleClick={() => {
        const at = new Date(day)
        at.setHours(hour, 0, 0, 0)
        onCreateAt(at)
      }}
    />
  )
}

function EventBlock({
  event,
  windows,
  onClick,
}: {
  event: CalendarEvent
  windows: DayWindow[]
  onClick: () => void
}) {
  // Cancelled appointments are frozen — no drag-to-reschedule. Clicking still
  // opens the edit dialog so the user can un-cancel from there.
  const isCancelled = event.status === "cancelled"
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: event.id, disabled: isCancelled })

  // `top` is offset from midnight of the day column (not from the starting
  // hour's cell), and `height` is capped at one cell so the card always fits
  // inside the slot it starts in — even when the booking runs longer than an
  // hour. The full range is surfaced in the label instead of by the card size.
  const startMinutes =
    event.startAt.getHours() * 60 + event.startAt.getMinutes()
  const endMinutes = event.endAt.getHours() * 60 + event.endAt.getMinutes()
  const durationMinutes = Math.max(0, endMinutes - startMinutes)
  const top = (startMinutes / 60) * HOUR_HEIGHT
  const naturalHeight = (durationMinutes / 60) * HOUR_HEIGHT - 2
  const height = Math.max(16, Math.min(naturalHeight, HOUR_HEIGHT - 2))
  const overflowsCell = durationMinutes > 60

  const palette = colorFor(event.status, event.type)
  const outsideAvailability =
    event.status !== "cancelled" &&
    !isRangeWithinDayWindows(event.startAt, event.endAt, windows)

  return (
    // @dnd-kit's useDraggable injects attrs derived from a module-global
    // counter + DndContext presence (role, tabIndex, aria-describedby)
    // that aren't stable across SSR and the post-mount client commit.
    // The `mounted` gate on DndContext upstream and every other approach
    // still leaves React 19 + Turbopack flagging the post-effect state as
    // a hydration diff. Suppress the warning on this one button — it's a
    // dev-only cosmetic; runtime behavior is correct.
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      suppressHydrationWarning
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        if (!isDragging) onClick()
      }}
      title={outsideAvailability ? "Outside your weekly availability" : undefined}
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
        outsideAvailability &&
          "border-amber-500/70 dark:border-amber-400/70",
        isDragging && "opacity-70",
      )}
    >
      <p className="flex items-center gap-1 truncate font-medium">
        {outsideAvailability && (
          <AlertTriangle
            aria-hidden
            className="size-3 shrink-0 text-amber-600 dark:text-amber-400"
          />
        )}
        <span className="truncate">{event.title}</span>
      </p>
      <p className="truncate opacity-80">
        {overflowsCell
          ? `${fmtTime(event.startAt)}–${fmtTime(event.endAt)}`
          : fmtTime(event.startAt)}
        {" · "}
        {event.clientName ?? "—"}
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
function isInCurrentWeek(d: Date): boolean {
  const weekStart = startOfWeek(new Date()).getTime()
  const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000
  const t = d.getTime()
  return t >= weekStart && t < weekEnd
}
function pad2(n: number): string {
  return n.toString().padStart(2, "0")
}
function toMs(d: Date | string | number): number {
  if (d instanceof Date) return d.getTime()
  if (typeof d === "number") return d
  return new Date(d).getTime()
}
function toDate(d: Date | string | number): Date {
  return d instanceof Date ? d : new Date(d)
}
function normalizeEvent(e: CalendarEvent): CalendarEvent {
  return { ...e, startAt: toDate(e.startAt), endAt: toDate(e.endAt) }
}
function fmtTime(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
function periodLabel(d: Date, view: View): string {
  if (view === "day") {
    return `${DAY_LABELS_LONG[d.getDay()]}, ${pad2(d.getDate())} ${MONTH_LABELS_LONG[d.getMonth()]} ${d.getFullYear()}`
  }
  if (view === "week") {
    const end = addDays(d, 6)
    return `${pad2(d.getDate())} ${MONTH_LABELS_SHORT[d.getMonth()]} – ${pad2(end.getDate())} ${MONTH_LABELS_SHORT[end.getMonth()]} ${end.getFullYear()}`
  }
  return `${MONTH_LABELS_LONG[d.getMonth()]} ${d.getFullYear()}`
}
// ─────────────────────────────────────────────────────────────────────────────
// Availability helpers
// ─────────────────────────────────────────────────────────────────────────────
export type DayWindow = { startMin: number; endMin: number }

function timeStringToMinutes(t: string): number {
  // Handles "HH:MM" or "HH:MM:SS" (postgres `time` serializes with seconds).
  const [h, m] = t.split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export function activeWindowsForDay(
  availability: AvailabilitySlot[],
  dayOfWeek: number,
): DayWindow[] {
  return availability
    .filter((s) => s.isActive && s.dayOfWeek === dayOfWeek)
    .map((s) => ({
      startMin: timeStringToMinutes(s.startTime),
      endMin: timeStringToMinutes(s.endTime),
    }))
}

function isRangeWithinDayWindows(
  start: Date,
  end: Date,
  windows: DayWindow[],
): boolean {
  if (windows.length === 0) return false
  const sMin = start.getHours() * 60 + start.getMinutes()
  const eMin = end.getHours() * 60 + end.getMinutes()
  // Multi-day appointments are treated as outside availability.
  if (
    start.getDate() !== end.getDate() ||
    start.getMonth() !== end.getMonth() ||
    start.getFullYear() !== end.getFullYear()
  ) {
    return false
  }
  return windows.some((w) => w.startMin <= sMin && eMin <= w.endMin)
}

export function isRangeWithinAvailability(
  start: Date,
  end: Date,
  availability: AvailabilitySlot[],
): boolean {
  const windows = activeWindowsForDay(availability, start.getDay())
  return isRangeWithinDayWindows(start, end, windows)
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
