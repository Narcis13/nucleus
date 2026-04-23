"use client"

import { AlertTriangle } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { isRangeWithinAvailability } from "@/components/dashboard/calendar/calendar-grid"
import {
  cancelAppointmentAction,
  createAppointmentAction,
  updateAppointmentAction,
} from "@/lib/actions/appointments"
import type { Appointment, AvailabilitySlot } from "@/types/domain"

// Create/edit/cancel dialog body for the calendar. Lives outside <Dialog> so
// the parent owns open state — that's how the calendar grid can drive the
// dialog from both an "Add" button and clicking an event.

export type ClientChoice = { id: string; fullName: string }
export type ServiceChoice = { id: string; name: string; durationMinutes: number | null }

export type AppointmentFormResult =
  | { kind: "created"; appointment: Appointment }
  | { kind: "updated"; appointment: Appointment }
  | { kind: "cancelled"; appointment: Appointment }
  | { kind: "closed" }

export type AppointmentFormProps = {
  initial?: Appointment | null
  defaultStart?: Date | null
  clients: ClientChoice[]
  services: ServiceChoice[]
  availability?: AvailabilitySlot[]
  onDone: (result: AppointmentFormResult) => void
}

const STATUSES = [
  { value: "scheduled", label: "Scheduled" },
  { value: "confirmed", label: "Confirmed" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "no_show", label: "No-show" },
] as const

const TYPES = [
  { value: "in_person", label: "In person" },
  { value: "virtual", label: "Virtual" },
  { value: "phone", label: "Phone" },
] as const

export function AppointmentForm({
  initial,
  defaultStart,
  clients,
  services,
  availability,
  onDone,
}: AppointmentFormProps) {
  const isEdit = Boolean(initial)
  const [form, setForm] = useState(() => initialState(initial, defaultStart))

  const outsideAvailability = useMemo(() => {
    if (!availability || availability.length === 0) return false
    if (!form.date || !form.startTime || !form.endTime) return false
    const start = combineDateTime(form.date, form.startTime)
    const end = combineDateTime(form.date, form.endTime)
    if (end <= start) return false
    return !isRangeWithinAvailability(start, end, availability)
  }, [availability, form.date, form.startTime, form.endTime])

  // Base UI `<Select.Value>` renders the label of the selected item when the
  // root Select is given an `items` prop — otherwise it falls back to the raw
  // value, which looks ugly ("in_person", a UUID, …). Build the `{value,label}`
  // arrays once per clients/services change.
  const clientItems = useMemo(
    () => clients.map((c) => ({ value: c.id, label: c.fullName })),
    [clients],
  )
  const serviceItems = useMemo(
    () => services.map((s) => ({ value: s.id, label: s.name })),
    [services],
  )

  // Reset when the parent swaps the editing target without unmounting us.
  useEffect(() => {
    setForm(initialState(initial, defaultStart))
  }, [initial, defaultStart])

  const create = useAction(createAppointmentAction, {
    onSuccess: ({ data }) => {
      toast.success("Appointment created.")
      if (data?.appointment) {
        onDone({ kind: "created", appointment: data.appointment })
      } else {
        onDone({ kind: "closed" })
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't create appointment.")
    },
  })

  const update = useAction(updateAppointmentAction, {
    onSuccess: ({ data }) => {
      toast.success("Appointment updated.")
      if (data?.appointment) {
        onDone({ kind: "updated", appointment: data.appointment })
      } else {
        onDone({ kind: "closed" })
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't update appointment.")
    },
  })

  const cancel = useAction(cancelAppointmentAction, {
    onSuccess: ({ data }) => {
      toast.success("Appointment cancelled.")
      if (data?.appointment) {
        onDone({ kind: "cancelled", appointment: data.appointment })
      } else {
        onDone({ kind: "closed" })
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't cancel appointment.")
    },
  })

  const isPending = create.isExecuting || update.isExecuting || cancel.isExecuting

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const startAt = combineDateTime(form.date, form.startTime).toISOString()
    const endAt = combineDateTime(form.date, form.endTime).toISOString()
    if (isEdit && initial) {
      update.execute({
        id: initial.id,
        title: form.title,
        clientId: form.clientId || null,
        serviceId: form.serviceId || null,
        startAt,
        endAt,
        type: form.type,
        status: form.status,
        location: form.location || null,
        notes: form.notes || null,
      })
    } else {
      create.execute({
        title: form.title,
        clientId: form.clientId || null,
        serviceId: form.serviceId || null,
        startAt,
        endAt,
        type: form.type,
        status: form.status,
        location: form.location || null,
        notes: form.notes || null,
      })
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground">
          Title
        </label>
        <Input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          required
          maxLength={200}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Client
          </label>
          <Select
            value={form.clientId}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, clientId: v ?? "" }))
            }
            items={clientItems}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="No client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Service
          </label>
          <Select
            value={form.serviceId}
            onValueChange={(v) => {
              const next = v ?? ""
              setForm((f) => {
                const svc = services.find((s) => s.id === next)
                if (svc?.durationMinutes) {
                  // Auto-extend end time when picking a service with a known duration.
                  const start = combineDateTime(f.date, f.startTime)
                  const end = new Date(
                    start.getTime() + svc.durationMinutes * 60_000,
                  )
                  return { ...f, serviceId: next, endTime: hhmm(end) }
                }
                return { ...f, serviceId: next }
              })
            }}
            items={serviceItems}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="No service" />
            </SelectTrigger>
            <SelectContent>
              {services.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Date
          </label>
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Starts
          </label>
          <Input
            type="time"
            value={form.startTime}
            onChange={(e) =>
              setForm((f) => ({ ...f, startTime: e.target.value }))
            }
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Ends
          </label>
          <Input
            type="time"
            value={form.endTime}
            onChange={(e) =>
              setForm((f) => ({ ...f, endTime: e.target.value }))
            }
            required
          />
        </div>
      </div>

      {outsideAvailability && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span>
            This time is outside your weekly availability. The appointment will
            still be saved.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Type
          </label>
          <Select
            value={form.type}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                type: (v ?? f.type) as typeof f.type,
              }))
            }
            items={TYPES}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Status
          </label>
          <Select
            value={form.status}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                status: (v ?? f.status) as typeof f.status,
              }))
            }
            items={STATUSES}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">
          Location
        </label>
        <Input
          value={form.location}
          onChange={(e) =>
            setForm((f) => ({ ...f, location: e.target.value }))
          }
          placeholder="Office, Zoom link, address…"
          maxLength={500}
        />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">
          Notes
        </label>
        <Textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={3}
          maxLength={2000}
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        {isEdit && initial ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isPending}
            onClick={() => cancel.execute({ id: initial.id })}
          >
            Cancel appointment
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onDone({ kind: "closed" })}
            disabled={isPending}
          >
            Close
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : isEdit ? "Save changes" : "Create"}
          </Button>
        </div>
      </div>
    </form>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

function initialState(
  initial: Appointment | null | undefined,
  defaultStart: Date | null | undefined,
) {
  if (initial) {
    const s = new Date(initial.startAt)
    const e = new Date(initial.endAt)
    return {
      title: initial.title,
      clientId: initial.clientId ?? "",
      serviceId: initial.serviceId ?? "",
      date: yyyymmdd(s),
      startTime: hhmm(s),
      endTime: hhmm(e),
      type: (initial.type ?? "in_person") as "in_person" | "virtual" | "phone",
      status: (initial.status ?? "scheduled") as
        | "scheduled"
        | "confirmed"
        | "pending"
        | "completed"
        | "cancelled"
        | "no_show",
      location: initial.location ?? "",
      notes: initial.notes ?? "",
    }
  }
  const start = defaultStart ?? roundToNextHour(new Date())
  const end = new Date(start.getTime() + 60 * 60_000)
  return {
    title: "",
    clientId: "",
    serviceId: "",
    date: yyyymmdd(start),
    startTime: hhmm(start),
    endTime: hhmm(end),
    type: "in_person" as const,
    status: "scheduled" as const,
    location: "",
    notes: "",
  }
}

function yyyymmdd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function hhmm(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0")
  const m = String(d.getMinutes()).padStart(2, "0")
  return `${h}:${m}`
}

function combineDateTime(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number]
  const [hh, mm] = time.split(":").map(Number) as [number, number]
  return new Date(y, m - 1, d, hh, mm, 0, 0)
}

function roundToNextHour(d: Date): Date {
  const x = new Date(d)
  x.setMinutes(0, 0, 0)
  x.setHours(x.getHours() + 1)
  return x
}
