"use client"

import { Loader2 } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  createBookingAction,
  getAvailableSlotsAction,
} from "@/lib/actions/appointments"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// <BookingWidget>
//
// Self-contained client widget — designed to be embedded on a professional's
// micro-site. Loads the next 14 days of available slots and walks the visitor
// through (1) pick day → (2) pick time → (3) enter contact info → (4) book.
//
// Owns no DB context: the parent passes `professionalId` (resolved from the
// micro-site slug) and an optional `serviceId`/`durationMinutes`. Submitting
// the form calls the public `createBookingAction`, which inserts an
// appointment with status="pending" so the professional can confirm it.
// ─────────────────────────────────────────────────────────────────────────────

export type BookingWidgetProps = {
  professionalId: string
  serviceId?: string
  durationMinutes?: number
  primaryColor?: string
  className?: string
}

type Slot = { start: string; end: string }

export function BookingWidget({
  professionalId,
  serviceId,
  durationMinutes = 30,
  primaryColor,
  className,
}: BookingWidgetProps) {
  const [step, setStep] = useState<"slot" | "details" | "done">("slot")
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [details, setDetails] = useState({
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    notes: "",
  })

  // Fetch the next 14 days on mount. We never auto-refresh — a stale slot
  // gets caught at booking time by the conflict check in createPublicBooking.
  const slotsAction = useAction(getAvailableSlotsAction, {
    onSuccess: ({ data }) => {
      if (data?.slots) setSlots(data.slots)
      setLoading(false)
    },
    onError: () => {
      toast.error("Couldn't load available slots.")
      setLoading(false)
    },
  })

  useEffect(() => {
    const from = new Date()
    const to = new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000)
    slotsAction.execute({
      professionalId,
      from: from.toISOString(),
      to: to.toISOString(),
      slotMinutes: durationMinutes,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professionalId, durationMinutes])

  const slotsByDay = useMemo(() => {
    const map = new Map<string, Slot[]>()
    for (const s of slots) {
      const key = new Date(s.start).toDateString()
      const list = map.get(key) ?? []
      list.push(s)
      map.set(key, list)
    }
    return Array.from(map.entries())
  }, [slots])

  const bookAction = useAction(createBookingAction, {
    onSuccess: () => {
      setStep("done")
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't book that slot.")
    },
  })

  const onBook = () => {
    if (!selectedSlot) return
    bookAction.execute({
      professionalId,
      serviceId,
      startAt: selectedSlot.start,
      endAt: selectedSlot.end,
      guestName: details.guestName,
      guestEmail: details.guestEmail,
      guestPhone: details.guestPhone || undefined,
      notes: details.notes || undefined,
    })
  }

  const themeStyle = primaryColor
    ? ({ ["--booking-accent" as string]: primaryColor } as React.CSSProperties)
    : undefined

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-background p-4 text-sm",
        className,
      )}
      style={themeStyle}
    >
      {step === "slot" && (
        <>
          <h3 className="font-heading text-base font-semibold text-foreground">
            Book a session
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Pick a time in the next two weeks. We&apos;ll confirm by email.
          </p>
          <div className="mt-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
              </div>
            ) : slotsByDay.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-6 text-center text-muted-foreground">
                No openings in the next two weeks. Please check back later.
              </p>
            ) : (
              slotsByDay.map(([dayLabel, list]) => (
                <div key={dayLabel}>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    {new Date(dayLabel).toLocaleDateString(undefined, {
                      weekday: "long",
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {list.map((s) => {
                      const active =
                        selectedSlot?.start === s.start &&
                        selectedSlot?.end === s.end
                      return (
                        <button
                          key={s.start}
                          type="button"
                          onClick={() => setSelectedSlot(s)}
                          className={cn(
                            "rounded-md border px-2.5 py-1 text-xs transition-colors",
                            active
                              ? "border-transparent bg-[var(--booking-accent,var(--primary))] text-primary-foreground"
                              : "border-border bg-background text-foreground hover:bg-muted",
                          )}
                        >
                          {new Date(s.start).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              disabled={!selectedSlot}
              onClick={() => setStep("details")}
              style={
                primaryColor
                  ? ({ background: primaryColor } as React.CSSProperties)
                  : undefined
              }
            >
              Continue
            </Button>
          </div>
        </>
      )}

      {step === "details" && selectedSlot && (
        <>
          <h3 className="font-heading text-base font-semibold text-foreground">
            Your details
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(selectedSlot.start).toLocaleString(undefined, {
              weekday: "short",
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <div className="mt-4 grid gap-3">
            <Input
              placeholder="Full name"
              value={details.guestName}
              onChange={(e) =>
                setDetails((d) => ({ ...d, guestName: e.target.value }))
              }
            />
            <Input
              type="email"
              placeholder="Email"
              value={details.guestEmail}
              onChange={(e) =>
                setDetails((d) => ({ ...d, guestEmail: e.target.value }))
              }
            />
            <Input
              type="tel"
              placeholder="Phone (optional)"
              value={details.guestPhone}
              onChange={(e) =>
                setDetails((d) => ({ ...d, guestPhone: e.target.value }))
              }
            />
            <Textarea
              placeholder="Anything we should know? (optional)"
              value={details.notes}
              onChange={(e) =>
                setDetails((d) => ({ ...d, notes: e.target.value }))
              }
              rows={3}
            />
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("slot")}
            >
              Back
            </Button>
            <Button
              type="button"
              disabled={
                !details.guestName ||
                !details.guestEmail ||
                bookAction.isExecuting
              }
              onClick={onBook}
              style={
                primaryColor
                  ? ({ background: primaryColor } as React.CSSProperties)
                  : undefined
              }
            >
              {bookAction.isExecuting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Confirm booking"
              )}
            </Button>
          </div>
        </>
      )}

      {step === "done" && (
        <div className="flex flex-col items-center py-6 text-center">
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            ✓
          </div>
          <p className="font-heading text-base font-semibold text-foreground">
            Booking received
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            We sent a confirmation email. The professional will confirm shortly.
          </p>
        </div>
      )}
    </div>
  )
}
