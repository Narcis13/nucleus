import "server-only"

import { and, asc, desc, eq, gte, isNull, lte, ne, sql } from "drizzle-orm"

import { withRLS } from "@/lib/db/rls"
import {
  appointments,
  clients,
  documents,
  formAssignments,
  invoices,
  leadActivities,
  leadStages,
  leads,
  messages,
  professionalClients,
  services,
} from "@/lib/db/schema"

// ─────────────────────────────────────────────────────────────────────────────
// Analytics — aggregate queries for the dashboard + analytics pages.
//
// Every helper runs through withRLS so the current professional's scope is
// enforced by policy. Numeric columns (`invoices.total`, `invoices.paid_amount`)
// are cast to float8 so postgres.js hands them back as JS numbers rather than
// strings.
// ─────────────────────────────────────────────────────────────────────────────

export type DateRange = {
  from: Date
  to: Date
}

export type RangePreset = "week" | "month" | "quarter" | "year" | "custom"

export const RANGE_PRESETS: Array<{ value: RangePreset; label: string }> = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "quarter", label: "This quarter" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom" },
]

// Resolve a preset to an absolute [from, to) window anchored on now.
export function resolveRange(
  preset: RangePreset,
  custom?: { from?: string; to?: string },
): DateRange {
  const now = new Date()
  const to = new Date(now)
  to.setHours(23, 59, 59, 999)
  const from = new Date(now)
  from.setHours(0, 0, 0, 0)

  if (preset === "week") {
    const day = from.getDay() // 0 Sun…6 Sat
    const offset = day === 0 ? 6 : day - 1 // week starts Monday
    from.setDate(from.getDate() - offset)
  } else if (preset === "month") {
    from.setDate(1)
  } else if (preset === "quarter") {
    const q = Math.floor(from.getMonth() / 3)
    from.setMonth(q * 3, 1)
  } else if (preset === "year") {
    from.setMonth(0, 1)
  } else if (preset === "custom") {
    if (custom?.from) {
      const parsed = new Date(custom.from)
      if (!Number.isNaN(parsed.getTime())) {
        parsed.setHours(0, 0, 0, 0)
        return {
          from: parsed,
          to: custom.to
            ? (() => {
                const t = new Date(custom.to)
                t.setHours(23, 59, 59, 999)
                return t
              })()
            : to,
        }
      }
    }
  }

  return { from, to }
}

// ─────────────────────────────────────────────────────────────────────────────
// Client metrics
// ─────────────────────────────────────────────────────────────────────────────
export type ClientMetrics = {
  totalActive: number
  newInPeriod: number
  churnedInPeriod: number
  byStatus: Array<{ status: string; count: number }>
  bySource: Array<{ source: string; count: number }>
  overTime: Array<{ date: string; count: number }>
}

export async function getClientMetrics(
  range: DateRange,
): Promise<ClientMetrics> {
  return withRLS(async (tx) => {
    const [activeRow, newRow, churnedRow, statusRows, sourceRows, timeRows] =
      await Promise.all([
        tx
          .select({ n: sql<number>`count(*)::int` })
          .from(professionalClients)
          .where(eq(professionalClients.status, "active")),
        tx
          .select({ n: sql<number>`count(*)::int` })
          .from(professionalClients)
          .where(
            and(
              gte(professionalClients.createdAt, range.from),
              lte(professionalClients.createdAt, range.to),
            ),
          ),
        tx
          .select({ n: sql<number>`count(*)::int` })
          .from(professionalClients)
          .where(
            and(
              eq(professionalClients.status, "archived"),
              gte(professionalClients.createdAt, range.from),
              lte(professionalClients.createdAt, range.to),
            ),
          ),
        tx
          .select({
            status: professionalClients.status,
            count: sql<number>`count(*)::int`,
          })
          .from(professionalClients)
          .groupBy(professionalClients.status),
        tx
          .select({
            source: sql<string | null>`${professionalClients.source}`,
            count: sql<number>`count(*)::int`,
          })
          .from(professionalClients)
          .groupBy(professionalClients.source),
        tx
          .select({
            date: sql<string>`to_char(${professionalClients.createdAt}::date, 'YYYY-MM-DD')`,
            count: sql<number>`count(*)::int`,
          })
          .from(professionalClients)
          .where(
            and(
              gte(professionalClients.createdAt, range.from),
              lte(professionalClients.createdAt, range.to),
            ),
          )
          .groupBy(sql`${professionalClients.createdAt}::date`)
          .orderBy(sql`${professionalClients.createdAt}::date`),
      ])

    return {
      totalActive: activeRow[0]?.n ?? 0,
      newInPeriod: newRow[0]?.n ?? 0,
      churnedInPeriod: churnedRow[0]?.n ?? 0,
      byStatus: statusRows.map((r) => ({
        status: r.status ?? "unknown",
        count: r.count,
      })),
      bySource: sourceRows.map((r) => ({
        source: r.source ?? "direct",
        count: r.count,
      })),
      overTime: timeRows.map((r) => ({ date: r.date, count: r.count })),
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Lead metrics + funnel
// ─────────────────────────────────────────────────────────────────────────────
export type LeadMetrics = {
  newInPeriod: number
  convertedInPeriod: number
  lostInPeriod: number
  conversionRate: number
  funnel: Array<{ stage: string; count: number; color: string | null }>
  bySource: Array<{ source: string; count: number }>
}

export async function getLeadMetrics(range: DateRange): Promise<LeadMetrics> {
  return withRLS(async (tx) => {
    const [newRow, convertedRow, lostRow, stageRows, sourceRows] =
      await Promise.all([
        tx
          .select({ n: sql<number>`count(*)::int` })
          .from(leads)
          .where(
            and(
              gte(leads.createdAt, range.from),
              lte(leads.createdAt, range.to),
            ),
          ),
        tx
          .select({ n: sql<number>`count(*)::int` })
          .from(leads)
          .where(
            and(
              sql`${leads.convertedClientId} is not null`,
              gte(leads.updatedAt, range.from),
              lte(leads.updatedAt, range.to),
            ),
          ),
        tx
          .select({ n: sql<number>`count(*)::int` })
          .from(leadActivities)
          .where(
            and(
              eq(leadActivities.type, "lost"),
              gte(leadActivities.createdAt, range.from),
              lte(leadActivities.createdAt, range.to),
            ),
          ),
        tx
          .select({
            stage: leadStages.name,
            color: leadStages.color,
            position: leadStages.position,
            count: sql<number>`count(${leads.id})::int`,
          })
          .from(leadStages)
          .leftJoin(leads, eq(leads.stageId, leadStages.id))
          .groupBy(leadStages.id, leadStages.name, leadStages.color, leadStages.position)
          .orderBy(asc(leadStages.position)),
        tx
          .select({
            source: sql<string | null>`${leads.source}`,
            count: sql<number>`count(*)::int`,
          })
          .from(leads)
          .groupBy(leads.source),
      ])

    const newCount = newRow[0]?.n ?? 0
    const convertedCount = convertedRow[0]?.n ?? 0
    const conversionRate =
      newCount > 0 ? Math.round((convertedCount / newCount) * 1000) / 10 : 0

    return {
      newInPeriod: newCount,
      convertedInPeriod: convertedCount,
      lostInPeriod: lostRow[0]?.n ?? 0,
      conversionRate,
      funnel: stageRows.map((r) => ({
        stage: r.stage,
        count: r.count,
        color: r.color,
      })),
      bySource: sourceRows.map((r) => ({
        source: r.source ?? "unknown",
        count: r.count,
      })),
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Revenue metrics
// ─────────────────────────────────────────────────────────────────────────────
export type RevenueMetrics = {
  invoiced: number
  collected: number
  outstanding: number
  overdue: number
  currency: string
  overTime: Array<{ date: string; invoiced: number; collected: number }>
}

export async function getRevenueMetrics(
  range: DateRange,
): Promise<RevenueMetrics> {
  return withRLS(async (tx) => {
    const [totals, timeRows, currencyRow] = await Promise.all([
      tx
        .select({
          invoiced: sql<number>`
            coalesce(sum(case
              when ${invoices.issueDate} >= ${range.from.toISOString().slice(0, 10)}
               and ${invoices.issueDate} <= ${range.to.toISOString().slice(0, 10)}
              then ${invoices.total}::float8
              else 0
            end), 0)::float8
          `,
          collected: sql<number>`
            coalesce(sum(case
              when ${invoices.paidDate} is not null
               and ${invoices.paidDate} >= ${range.from.toISOString().slice(0, 10)}
               and ${invoices.paidDate} <= ${range.to.toISOString().slice(0, 10)}
              then ${invoices.paidAmount}::float8
              else 0
            end), 0)::float8
          `,
          outstanding: sql<number>`
            coalesce(sum(case
              when ${invoices.status} in ('sent','viewed','partial','overdue')
              then (${invoices.total}::float8 - ${invoices.paidAmount}::float8)
              else 0
            end), 0)::float8
          `,
          overdue: sql<number>`
            coalesce(sum(case
              when ${invoices.status} = 'overdue'
              then (${invoices.total}::float8 - ${invoices.paidAmount}::float8)
              else 0
            end), 0)::float8
          `,
        })
        .from(invoices),
      tx
        .select({
          date: sql<string>`to_char(${invoices.issueDate}, 'YYYY-MM-DD')`,
          invoiced: sql<number>`coalesce(sum(${invoices.total}::float8), 0)::float8`,
          collected: sql<number>`
            coalesce(sum(case
              when ${invoices.paidDate} is not null
              then ${invoices.paidAmount}::float8
              else 0
            end), 0)::float8
          `,
        })
        .from(invoices)
        .where(
          and(
            gte(invoices.issueDate, range.from.toISOString().slice(0, 10)),
            lte(invoices.issueDate, range.to.toISOString().slice(0, 10)),
          ),
        )
        .groupBy(invoices.issueDate)
        .orderBy(asc(invoices.issueDate)),
      tx
        .select({ currency: invoices.currency })
        .from(invoices)
        .orderBy(desc(invoices.createdAt))
        .limit(1),
    ])

    return {
      invoiced: Number(totals[0]?.invoiced ?? 0),
      collected: Number(totals[0]?.collected ?? 0),
      outstanding: Number(totals[0]?.outstanding ?? 0),
      overdue: Number(totals[0]?.overdue ?? 0),
      currency: currencyRow[0]?.currency ?? "EUR",
      overTime: timeRows.map((r) => ({
        date: r.date,
        invoiced: Number(r.invoiced),
        collected: Number(r.collected),
      })),
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Appointment metrics
// ─────────────────────────────────────────────────────────────────────────────
export type AppointmentMetrics = {
  total: number
  completed: number
  cancelled: number
  noShow: number
  noShowRate: number
  byType: Array<{ type: string; count: number }>
  byService: Array<{ service: string; count: number }>
  byStatus: Array<{ status: string; count: number }>
}

export async function getAppointmentMetrics(
  range: DateRange,
): Promise<AppointmentMetrics> {
  return withRLS(async (tx) => {
    const [totals, typeRows, serviceRows] = await Promise.all([
      tx
        .select({
          total: sql<number>`count(*)::int`,
          completed: sql<number>`count(*) filter (where ${appointments.status} = 'completed')::int`,
          cancelled: sql<number>`count(*) filter (where ${appointments.status} = 'cancelled')::int`,
          noShow: sql<number>`count(*) filter (where ${appointments.status} = 'no_show')::int`,
        })
        .from(appointments)
        .where(
          and(
            gte(appointments.startAt, range.from),
            lte(appointments.startAt, range.to),
          ),
        ),
      tx
        .select({
          type: appointments.type,
          count: sql<number>`count(*)::int`,
        })
        .from(appointments)
        .where(
          and(
            gte(appointments.startAt, range.from),
            lte(appointments.startAt, range.to),
          ),
        )
        .groupBy(appointments.type),
      tx
        .select({
          service: services.name,
          count: sql<number>`count(${appointments.id})::int`,
        })
        .from(appointments)
        .leftJoin(services, eq(services.id, appointments.serviceId))
        .where(
          and(
            gte(appointments.startAt, range.from),
            lte(appointments.startAt, range.to),
          ),
        )
        .groupBy(services.name),
    ])

    const total = totals[0]?.total ?? 0
    const completed = totals[0]?.completed ?? 0
    const cancelled = totals[0]?.cancelled ?? 0
    const noShow = totals[0]?.noShow ?? 0
    const noShowRate =
      total > 0 ? Math.round((noShow / total) * 1000) / 10 : 0

    return {
      total,
      completed,
      cancelled,
      noShow,
      noShowRate,
      byType: typeRows.map((r) => ({ type: r.type ?? "other", count: r.count })),
      byService: serviceRows.map((r) => ({
        service: r.service ?? "Unassigned",
        count: r.count,
      })),
      byStatus: [
        { status: "completed", count: completed },
        { status: "cancelled", count: cancelled },
        { status: "no_show", count: noShow },
      ],
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Messaging metrics
// ─────────────────────────────────────────────────────────────────────────────
export type MessagingMetrics = {
  sent: number
  received: number
  avgResponseMinutes: number
  unread: number
}

export async function getMessagingMetrics(
  range: DateRange,
): Promise<MessagingMetrics> {
  return withRLS(async (tx) => {
    const [counts, unreadRow, responseRow] = await Promise.all([
      tx
        .select({
          sent: sql<number>`count(*) filter (where ${messages.senderRole} = 'professional')::int`,
          received: sql<number>`count(*) filter (where ${messages.senderRole} = 'client')::int`,
        })
        .from(messages)
        .where(
          and(
            gte(messages.createdAt, range.from),
            lte(messages.createdAt, range.to),
          ),
        ),
      tx
        .select({ n: sql<number>`count(*)::int` })
        .from(messages)
        .where(
          and(
            eq(messages.senderRole, "client"),
            isNull(messages.readAt),
          ),
        ),
      // Average time (in minutes) between a client message and the next
      // professional reply in the same conversation. LATERAL lets us pick the
      // earliest following professional message per client message — anything
      // without a reply is excluded from the average.
      tx
        .select({
          avg: sql<number>`coalesce(avg(extract(epoch from (next_pro.created_at - client_msg.created_at)) / 60.0), 0)::float8`,
        })
        .from(
          sql`${messages} as client_msg
            left join lateral (
              select m.created_at from ${messages} m
              where m.conversation_id = client_msg.conversation_id
                and m.sender_role = 'professional'
                and m.created_at > client_msg.created_at
              order by m.created_at asc
              limit 1
            ) next_pro on true`,
        )
        .where(
          sql`client_msg.sender_role = 'client'
            and client_msg.created_at >= ${range.from}
            and client_msg.created_at <= ${range.to}
            and next_pro.created_at is not null`,
        ),
    ])

    return {
      sent: counts[0]?.sent ?? 0,
      received: counts[0]?.received ?? 0,
      avgResponseMinutes: Math.round(Number(responseRow[0]?.avg ?? 0)),
      unread: unreadRow[0]?.n ?? 0,
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity feed — union of recent events across the product.
// ─────────────────────────────────────────────────────────────────────────────
export type ActivityFeedItem = {
  id: string
  type:
    | "client_added"
    | "lead_new"
    | "lead_converted"
    | "appointment"
    | "invoice"
    | "message"
    | "form"
    | "document"
  title: string
  description: string | null
  href: string | null
  occurredAt: Date
}

export async function getActivityFeed(
  limit = 20,
): Promise<ActivityFeedItem[]> {
  return withRLS(async (tx) => {
    const [newClients, newLeads, convertedLeads, recentAppointments, recentInvoices, recentMsgs, recentForms, recentDocs] =
      await Promise.all([
        tx
          .select({
            id: professionalClients.id,
            name: clients.fullName,
            createdAt: professionalClients.createdAt,
            clientId: clients.id,
          })
          .from(professionalClients)
          .innerJoin(clients, eq(clients.id, professionalClients.clientId))
          .orderBy(desc(professionalClients.createdAt))
          .limit(limit),
        tx
          .select({
            id: leads.id,
            name: leads.fullName,
            createdAt: leads.createdAt,
          })
          .from(leads)
          .orderBy(desc(leads.createdAt))
          .limit(limit),
        tx
          .select({
            id: leads.id,
            name: leads.fullName,
            updatedAt: leads.updatedAt,
          })
          .from(leads)
          .where(sql`${leads.convertedClientId} is not null`)
          .orderBy(desc(leads.updatedAt))
          .limit(limit),
        tx
          .select({
            id: appointments.id,
            title: appointments.title,
            status: appointments.status,
            startAt: appointments.startAt,
            createdAt: appointments.createdAt,
          })
          .from(appointments)
          .orderBy(desc(appointments.createdAt))
          .limit(limit),
        tx
          .select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            status: invoices.status,
            total: invoices.total,
            currency: invoices.currency,
            createdAt: invoices.createdAt,
          })
          .from(invoices)
          .orderBy(desc(invoices.createdAt))
          .limit(limit),
        tx
          .select({
            id: messages.id,
            content: messages.content,
            senderRole: messages.senderRole,
            conversationId: messages.conversationId,
            createdAt: messages.createdAt,
          })
          .from(messages)
          .where(eq(messages.senderRole, "client"))
          .orderBy(desc(messages.createdAt))
          .limit(limit),
        tx
          .select({
            id: formAssignments.id,
            status: formAssignments.status,
            createdAt: formAssignments.createdAt,
          })
          .from(formAssignments)
          .orderBy(desc(formAssignments.createdAt))
          .limit(limit),
        tx
          .select({
            id: documents.id,
            name: documents.name,
            createdAt: documents.createdAt,
          })
          .from(documents)
          .orderBy(desc(documents.createdAt))
          .limit(limit),
      ])

    const items: ActivityFeedItem[] = [
      ...newClients.map<ActivityFeedItem>((r) => ({
        id: `client:${r.id}`,
        type: "client_added",
        title: `${r.name} joined as a client`,
        description: null,
        href: `/dashboard/clients/${r.clientId}`,
        occurredAt: r.createdAt,
      })),
      ...newLeads.map<ActivityFeedItem>((r) => ({
        id: `lead-new:${r.id}`,
        type: "lead_new",
        title: `New lead — ${r.name}`,
        description: null,
        href: `/dashboard/leads`,
        occurredAt: r.createdAt,
      })),
      ...convertedLeads.map<ActivityFeedItem>((r) => ({
        id: `lead-conv:${r.id}`,
        type: "lead_converted",
        title: `${r.name} converted to a client`,
        description: null,
        href: `/dashboard/leads`,
        occurredAt: r.updatedAt,
      })),
      ...recentAppointments.map<ActivityFeedItem>((r) => ({
        id: `apt:${r.id}`,
        type: "appointment",
        title: `Appointment ${r.status}`,
        description: `${r.title} · ${r.startAt.toLocaleString()}`,
        href: `/dashboard/calendar`,
        occurredAt: r.createdAt,
      })),
      ...recentInvoices.map<ActivityFeedItem>((r) => ({
        id: `inv:${r.id}`,
        type: "invoice",
        title: `Invoice ${r.invoiceNumber} · ${r.status}`,
        description: `${r.total} ${r.currency}`,
        href: `/dashboard/invoices`,
        occurredAt: r.createdAt,
      })),
      ...recentMsgs.map<ActivityFeedItem>((r) => ({
        id: `msg:${r.id}`,
        type: "message",
        title: "New message from a client",
        description: r.content?.slice(0, 120) ?? null,
        href: `/dashboard/messages`,
        occurredAt: r.createdAt,
      })),
      ...recentForms.map<ActivityFeedItem>((r) => ({
        id: `form:${r.id}`,
        type: "form",
        title: `Form ${r.status}`,
        description: null,
        href: `/dashboard/forms`,
        occurredAt: r.createdAt,
      })),
      ...recentDocs.map<ActivityFeedItem>((r) => ({
        id: `doc:${r.id}`,
        type: "document",
        title: "Document uploaded",
        description: r.name,
        href: `/dashboard/documents`,
        occurredAt: r.createdAt,
      })),
    ]

    return items
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, limit)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Today's agenda — appointments for the dashboard home, plus unread count.
// ─────────────────────────────────────────────────────────────────────────────
export type AgendaItem = {
  id: string
  title: string
  startAt: Date
  endAt: Date
  status: string
  clientName: string | null
  serviceName: string | null
}

export async function getTodayAgenda(): Promise<AgendaItem[]> {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  return withRLS(async (tx) => {
    const rows = await tx
      .select({
        appointment: appointments,
        clientName: clients.fullName,
        serviceName: services.name,
      })
      .from(appointments)
      .leftJoin(clients, eq(clients.id, appointments.clientId))
      .leftJoin(services, eq(services.id, appointments.serviceId))
      .where(
        and(
          gte(appointments.startAt, start),
          lte(appointments.startAt, end),
          ne(appointments.status, "cancelled"),
        ),
      )
      .orderBy(asc(appointments.startAt))

    return rows.map((r) => ({
      id: r.appointment.id,
      title: r.appointment.title,
      startAt: r.appointment.startAt,
      endAt: r.appointment.endAt,
      status: r.appointment.status,
      clientName: r.clientName,
      serviceName: r.serviceName,
    }))
  })
}

// Dashboard summary — bundle everything the home page needs in one call so we
// can do a single await at the top of the RSC.
export type DashboardSummary = {
  range: DateRange
  clients: ClientMetrics
  leads: LeadMetrics
  revenue: RevenueMetrics
  appointments: AppointmentMetrics
  messaging: MessagingMetrics
  agenda: AgendaItem[]
  activity: ActivityFeedItem[]
}

export async function getDashboardSummary(
  range: DateRange,
): Promise<DashboardSummary> {
  const [clientsM, leadsM, revenueM, apptM, msgM, agenda, activity] =
    await Promise.all([
      getClientMetrics(range),
      getLeadMetrics(range),
      getRevenueMetrics(range),
      getAppointmentMetrics(range),
      getMessagingMetrics(range),
      getTodayAgenda(),
      getActivityFeed(20),
    ])
  return {
    range,
    clients: clientsM,
    leads: leadsM,
    revenue: revenueM,
    appointments: apptM,
    messaging: msgM,
    agenda,
    activity,
  }
}
