import Link from "next/link"
import {
  Calendar,
  CheckCircle2,
  CreditCard,
  MessageCircle,
  Target,
  Users,
} from "lucide-react"
import type { Route } from "next"

import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { KpiCard } from "@/components/dashboard/analytics/kpi-card"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  getDashboardSummary,
  resolveRange,
  type AgendaItem,
} from "@/lib/analytics/queries"

// Home lands on the "this month" range so the summary tiles reflect whatever
// the user has done recently. Deeper slicing lives on /dashboard/analytics.
export default async function DashboardHomePage() {
  const range = resolveRange("month")
  const summary = await getDashboardSummary(range)

  const currency = summary.revenue.currency
  const money = (n: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Your practice this month."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" render={<Link href={"/dashboard/analytics" as Route} />}>
              View analytics
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          size="sm"
          label="Active clients"
          value={summary.clients.totalActive}
          hint={`${summary.clients.newInPeriod} new this month`}
          icon={<Users />}
        />
        <KpiCard
          size="sm"
          label="New leads"
          value={summary.leads.newInPeriod}
          hint={`${summary.leads.conversionRate}% converted`}
          icon={<Target />}
        />
        <KpiCard
          size="sm"
          label="Revenue collected"
          value={money(summary.revenue.collected)}
          hint={`${money(summary.revenue.outstanding)} outstanding`}
          icon={<CreditCard />}
        />
        <KpiCard
          size="sm"
          label="Appointments"
          value={summary.appointments.completed}
          hint={`${summary.appointments.noShowRate}% no-show rate`}
          icon={<Calendar />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <AgendaCard items={summary.agenda} />
          <QuickActions />
        </div>
        <div className="flex flex-col gap-4">
          <UnreadMessagesCard count={summary.messaging.unread} />
          <ActivityFeed items={summary.activity} />
        </div>
      </div>
    </div>
  )
}

function AgendaCard({ items }: { items: AgendaItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground" />
            Today
          </span>
          <Button
            variant="ghost"
            size="xs"
            render={<Link href={"/dashboard/calendar" as Route} />}
          >
            Open calendar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            No appointments on the calendar for today.
          </p>
        ) : (
          <ol className="divide-y divide-border text-sm">
            {items.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {a.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[a.clientName, a.serviceName].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div className="tabular-nums text-foreground">
                    {formatTime(a.startAt)}
                  </div>
                  <div>
                    {Math.round(
                      (a.endAt.getTime() - a.startAt.getTime()) / 60_000,
                    )}
                    m
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

function UnreadMessagesCard({ count }: { count: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MessageCircle className="size-4 text-muted-foreground" />
            Messages
          </span>
          <Button
            variant="ghost"
            size="xs"
            render={<Link href={"/dashboard/messages" as Route} />}
          >
            Open inbox
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="font-heading text-2xl font-semibold tabular-nums text-foreground">
            {count}
          </div>
          <div className="text-xs text-muted-foreground">
            unread from clients
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function QuickActions() {
  const actions: Array<{ label: string; href: Route; icon: typeof Users }> = [
    { label: "New client", href: "/dashboard/clients", icon: Users },
    { label: "New lead", href: "/dashboard/leads", icon: Target },
    { label: "New invoice", href: "/dashboard/invoices", icon: CreditCard },
    { label: "Schedule", href: "/dashboard/calendar", icon: Calendar },
    { label: "Message", href: "/dashboard/messages", icon: MessageCircle },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-muted-foreground" />
          Quick actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <Button
              key={a.label}
              variant="outline"
              size="sm"
              render={<Link href={a.href} />}
            >
              <a.icon />
              {a.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
}
