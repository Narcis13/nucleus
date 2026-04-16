import { asc, gte } from "drizzle-orm"
import { AlertTriangle, CheckCircle2, Clock, Coins } from "lucide-react"
import { redirect } from "next/navigation"

import {
  type AppointmentChoice,
  type ClientChoice,
} from "@/components/dashboard/invoices/invoice-builder"
import { InvoiceList } from "@/components/dashboard/invoices/invoice-list"
import { StatCard } from "@/components/dashboard/invoices/stat-card"
import { PageHeader } from "@/components/shared/page-header"
import { withRLS } from "@/lib/db/rls"
import {
  getInvoiceSettings,
  getInvoiceStats,
  getInvoices,
} from "@/lib/db/queries/invoices"
import { getProfessional } from "@/lib/db/queries/professionals"
import { appointments, clients } from "@/lib/db/schema"

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard → Invoices
//
// Server-renders the stats strip + paginated invoice list. All reads go
// through `withRLS` so they're scoped to the current professional. The list
// is a client island — filtering, the builder dialog, and row-level actions
// all live in `<InvoiceList>`.
// ─────────────────────────────────────────────────────────────────────────────

export default async function InvoicesPage() {
  const professional = await getProfessional()
  if (!professional) redirect("/onboarding")

  const [list, stats, settings, lookups] = await Promise.all([
    getInvoices("all"),
    getInvoiceStats(),
    getInvoiceSettings(),
    loadLookups(),
  ])

  const currency = professional.currency ?? "EUR"

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Invoices"
        description="Track what you've billed and what you're still owed — no payment processing, just clear money-in sight."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Outstanding"
          value={formatCurrency(stats.outstanding, currency)}
          caption={`${stats.outstandingCount} invoice${stats.outstandingCount === 1 ? "" : "s"} open`}
          color="yellow"
          icon={Clock}
        />
        <StatCard
          label="Overdue"
          value={formatCurrency(stats.overdue, currency)}
          caption={`${stats.overdueCount} past due`}
          color="red"
          icon={AlertTriangle}
        />
        <StatCard
          label="Paid this month"
          value={formatCurrency(stats.paidThisMonth, currency)}
          caption={`${stats.paidThisMonthCount} payment${stats.paidThisMonthCount === 1 ? "" : "s"}`}
          color="green"
          icon={CheckCircle2}
        />
        <StatCard
          label="Avg. days to pay"
          value={`${stats.avgDaysToPay} day${stats.avgDaysToPay === 1 ? "" : "s"}`}
          caption={`${stats.draftCount} draft${stats.draftCount === 1 ? "" : "s"} waiting`}
          color="blue"
          icon={Coins}
        />
      </div>

      <InvoiceList
        initial={list}
        clients={lookups.clients}
        appointments={lookups.appointments}
        settings={settings}
        currency={currency}
      />
    </div>
  )
}

async function loadLookups(): Promise<{
  clients: ClientChoice[]
  appointments: AppointmentChoice[]
}> {
  const horizon = new Date()
  horizon.setDate(horizon.getDate() - 90)

  return withRLS(async (tx) => {
    const [clientRows, apptRows] = await Promise.all([
      tx
        .select({
          id: clients.id,
          fullName: clients.fullName,
          email: clients.email,
        })
        .from(clients)
        .orderBy(asc(clients.fullName))
        .limit(500),
      tx
        .select({
          id: appointments.id,
          title: appointments.title,
          startAt: appointments.startAt,
          status: appointments.status,
        })
        .from(appointments)
        .where(gte(appointments.startAt, horizon))
        .orderBy(asc(appointments.startAt))
        .limit(200),
    ])
    return {
      clients: clientRows,
      appointments: apptRows
        .filter((a) => a.status !== "cancelled")
        .map<AppointmentChoice>((a) => ({
          id: a.id,
          title: a.title,
          startAtIso: new Date(a.startAt).toISOString(),
        })),
    }
  })
}

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${Math.round(value)} ${currency}`
  }
}

