import { Link } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { AppointmentWithRefs } from "@/lib/db/queries/appointments"
import { cn } from "@/lib/utils"

// Right-rail sidebar on the calendar page: today's agenda + the next handful
// of upcoming appointments. Server-rendered — drag/edit happens in the grid.

export function AgendaSidebar({
  today,
  upcoming,
  iCalUrl,
}: {
  today: AppointmentWithRefs[]
  upcoming: AppointmentWithRefs[]
  iCalUrl: string
}) {
  return (
    <aside className="flex flex-col gap-4">
      <Section title="Today">
        {today.length === 0 ? (
          <Empty label="Nothing scheduled today." />
        ) : (
          <ul className="flex flex-col gap-2">
            {today.map((row) => (
              <AppointmentRow key={row.appointment.id} row={row} />
            ))}
          </ul>
        )}
      </Section>

      <Section title="Upcoming">
        {upcoming.length === 0 ? (
          <Empty label="No upcoming appointments." />
        ) : (
          <ul className="flex flex-col gap-2">
            {upcoming.map((row) => (
              <AppointmentRow key={row.appointment.id} row={row} showDate />
            ))}
          </ul>
        )}
      </Section>

      <Section title="Subscribe">
        <p className="mb-2 text-xs text-muted-foreground">
          Add this calendar to Google, Apple, or Outlook by subscribing to the
          link below.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          render={<a href={iCalUrl} target="_blank" rel="noreferrer" />}
        >
          <Link />
          iCal feed
        </Button>
      </Section>
    </aside>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-border bg-background p-3">
      <h3 className="font-heading text-sm font-semibold text-foreground">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  )
}

function Empty({ label }: { label: string }) {
  return <p className="text-xs text-muted-foreground">{label}</p>
}

function AppointmentRow({
  row,
  showDate = false,
}: {
  row: AppointmentWithRefs
  showDate?: boolean
}) {
  const start = new Date(row.appointment.startAt)
  const end = new Date(row.appointment.endAt)
  return (
    <li className="rounded-md border border-border/60 px-2 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-foreground">
          {row.appointment.title}
        </p>
        <Badge variant="outline" className={cn("shrink-0", statusClass(row.appointment.status))}>
          {row.appointment.status}
        </Badge>
      </div>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        {showDate
          ? start.toLocaleDateString(undefined, {
              day: "2-digit",
              month: "short",
            }) + " · "
          : ""}
        {start.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        })}
        {" – "}
        {end.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        })}
        {row.client?.fullName ? ` · ${row.client.fullName}` : ""}
      </p>
    </li>
  )
}

function statusClass(status: string): string {
  if (status === "confirmed") return "border-emerald-300 text-emerald-800 dark:text-emerald-300"
  if (status === "pending") return "border-amber-300 text-amber-800 dark:text-amber-300"
  if (status === "cancelled") return "border-border text-muted-foreground line-through"
  return ""
}
