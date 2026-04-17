import {
  Calendar,
  CreditCard,
  MessageCircle,
  Target,
  Users,
} from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartArea } from "@/components/dashboard/analytics/chart-area"
import { ChartBar } from "@/components/dashboard/analytics/chart-bar"
import { ChartFunnel } from "@/components/dashboard/analytics/chart-funnel"
import { ChartPie } from "@/components/dashboard/analytics/chart-pie"
import { DateRangeSelector } from "@/components/dashboard/analytics/date-range-selector"
import {
  ExportButtons,
  type AnalyticsExportPayload,
} from "@/components/dashboard/analytics/export-buttons"
import { KpiCard } from "@/components/dashboard/analytics/kpi-card"
import { NicheMetricsPlaceholder } from "@/components/dashboard/analytics/niche-placeholder"
import {
  getDashboardSummary,
  resolveRange,
  type RangePreset,
} from "@/lib/analytics/queries"

type SearchParams = Promise<{
  range?: string
  from?: string
  to?: string
}>

function parsePreset(value: string | undefined): RangePreset {
  if (
    value === "week" ||
    value === "month" ||
    value === "quarter" ||
    value === "year" ||
    value === "custom"
  ) {
    return value
  }
  return "month"
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const preset = parsePreset(params.range)
  const range = resolveRange(preset, { from: params.from, to: params.to })
  const summary = await getDashboardSummary(range)

  const currency = summary.revenue.currency
  const money = (n: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n)

  const rangeLabel = `${range.from.toISOString().slice(0, 10)}_to_${range.to
    .toISOString()
    .slice(0, 10)}`

  const kpis: AnalyticsExportPayload["kpis"] = [
    { label: "Active clients", value: String(summary.clients.totalActive) },
    { label: "New clients", value: String(summary.clients.newInPeriod) },
    { label: "Churned clients", value: String(summary.clients.churnedInPeriod) },
    { label: "New leads", value: String(summary.leads.newInPeriod) },
    { label: "Converted leads", value: String(summary.leads.convertedInPeriod) },
    { label: "Lost leads", value: String(summary.leads.lostInPeriod) },
    { label: "Lead conversion rate", value: `${summary.leads.conversionRate}%` },
    { label: "Invoiced", value: money(summary.revenue.invoiced) },
    { label: "Collected", value: money(summary.revenue.collected) },
    { label: "Outstanding", value: money(summary.revenue.outstanding) },
    { label: "Appointments completed", value: String(summary.appointments.completed) },
    { label: "Appointments cancelled", value: String(summary.appointments.cancelled) },
    { label: "No-show rate", value: `${summary.appointments.noShowRate}%` },
    { label: "Messages sent", value: String(summary.messaging.sent) },
    { label: "Messages received", value: String(summary.messaging.received) },
    {
      label: "Avg response",
      value: formatMinutes(summary.messaging.avgResponseMinutes),
    },
  ]

  const exportPayload: AnalyticsExportPayload = {
    rangeLabel,
    kpis,
    clientsOverTime: summary.clients.overTime,
    revenueOverTime: summary.revenue.overTime,
    leadFunnel: summary.leads.funnel.map((f) => ({
      stage: f.stage,
      count: f.count,
    })),
    appointmentsByType: summary.appointments.byType,
    clientsBySource: summary.clients.bySource,
  }

  return (
    <div className="flex flex-col gap-6" data-print-root>
      <PageHeader
        title="Analytics"
        description={`Metrics for ${formatDate(range.from)} — ${formatDate(range.to)}`}
        actions={
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <DateRangeSelector
              preset={preset}
              from={params.from}
              to={params.to}
            />
            <ExportButtons payload={exportPayload} />
          </div>
        }
      />

      {/* Clients */}
      <Section title="Clients" icon={<Users />}>
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard
            label="Active"
            value={summary.clients.totalActive}
            icon={<Users />}
          />
          <KpiCard label="New in period" value={summary.clients.newInPeriod} />
          <KpiCard label="Churned" value={summary.clients.churnedInPeriod} />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Clients over time</CardTitle>
              <CardDescription>New clients added per day</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartArea data={summary.clients.overTime.map((d) => ({
                label: d.date,
                value: d.count,
              }))} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Acquisition by source</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartPie
                data={summary.clients.bySource.map((s) => ({
                  label: s.source,
                  value: s.count,
                }))}
              />
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* Leads */}
      <Section title="Leads" icon={<Target />}>
        <div className="grid gap-3 sm:grid-cols-4">
          <KpiCard label="New" value={summary.leads.newInPeriod} />
          <KpiCard label="Converted" value={summary.leads.convertedInPeriod} />
          <KpiCard label="Lost" value={summary.leads.lostInPeriod} />
          <KpiCard
            label="Conversion rate"
            value={`${summary.leads.conversionRate}%`}
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Lead funnel</CardTitle>
            <CardDescription>
              Stage-by-stage progression across the pipeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartFunnel data={summary.leads.funnel} />
          </CardContent>
        </Card>
      </Section>

      {/* Revenue */}
      <Section title="Revenue" icon={<CreditCard />}>
        <div className="grid gap-3 sm:grid-cols-4">
          <KpiCard label="Invoiced" value={money(summary.revenue.invoiced)} />
          <KpiCard label="Collected" value={money(summary.revenue.collected)} />
          <KpiCard
            label="Outstanding"
            value={money(summary.revenue.outstanding)}
          />
          <KpiCard label="Overdue" value={money(summary.revenue.overdue)} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Revenue over time</CardTitle>
            <CardDescription>Invoiced vs. collected, by day</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartBar
              valueFormatter={(v) => money(v)}
              data={summary.revenue.overTime.map((d) => ({
                label: d.date,
                values: [
                  { key: "invoiced", value: d.invoiced },
                  { key: "collected", value: d.collected },
                ],
              }))}
            />
          </CardContent>
        </Card>
      </Section>

      {/* Appointments */}
      <Section title="Appointments" icon={<Calendar />}>
        <div className="grid gap-3 sm:grid-cols-4">
          <KpiCard label="Completed" value={summary.appointments.completed} />
          <KpiCard label="Cancelled" value={summary.appointments.cancelled} />
          <KpiCard label="No-shows" value={summary.appointments.noShow} />
          <KpiCard
            label="No-show rate"
            value={`${summary.appointments.noShowRate}%`}
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>By type</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartPie
                data={summary.appointments.byType.map((r) => ({
                  label: r.type.replace("_", " "),
                  value: r.count,
                }))}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>By service</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartPie
                data={summary.appointments.byService.map((r) => ({
                  label: r.service,
                  value: r.count,
                }))}
              />
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* Messaging */}
      <Section title="Messaging" icon={<MessageCircle />}>
        <div className="grid gap-3 sm:grid-cols-4">
          <KpiCard label="Sent" value={summary.messaging.sent} />
          <KpiCard label="Received" value={summary.messaging.received} />
          <KpiCard label="Unread" value={summary.messaging.unread} />
          <KpiCard
            label="Avg response"
            value={formatMinutes(summary.messaging.avgResponseMinutes)}
          />
        </div>
      </Section>

      {/* Niche slot */}
      <NicheMetricsPlaceholder />

      <ActivityFeed items={summary.activity} />
    </div>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 font-heading text-sm font-medium text-muted-foreground">
        <span className="[&>svg]:size-4">{icon}</span>
        {title}
      </h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatMinutes(mins: number): string {
  if (!mins) return "—"
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}
