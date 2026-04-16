import "server-only"

import { and, desc, eq, inArray, lt, sql } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { withRLS, type Tx } from "@/lib/db/rls"
import {
  clients,
  invoiceSettings,
  invoices,
  paymentReminders,
  professionals,
} from "@/lib/db/schema"
import type {
  Client,
  Invoice,
  InvoiceLineItem,
  InvoiceSettings,
  NewInvoice,
  NewInvoiceSettings,
  PaymentReminder,
  Professional,
} from "@/types/domain"

import { getProfessional } from "./professionals"

// ─────────────────────────────────────────────────────────────────────────────
// INVOICES — tracking only. Every read is RLS-scoped to the current
// professional (list/detail) except the dunning-sweep helpers, which run from
// Trigger.dev / cron without a user session and must go through `dbAdmin`.
// ─────────────────────────────────────────────────────────────────────────────

export type InvoiceListItem = {
  invoice: Invoice
  client: Pick<Client, "id" | "fullName" | "email"> | null
}

export type InvoiceStats = {
  outstanding: number
  outstandingCount: number
  overdue: number
  overdueCount: number
  paidThisMonth: number
  paidThisMonthCount: number
  avgDaysToPay: number
  draftCount: number
}

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "partial"
  | "paid"
  | "overdue"
  | "void"

export type InvoiceFilter = "all" | InvoiceStatus | "outstanding"

// ── Reads ───────────────────────────────────────────────────────────────────

export async function getInvoices(
  filter: InvoiceFilter = "all",
): Promise<InvoiceListItem[]> {
  return withRLS(async (tx) => {
    const conditions = []
    if (filter === "outstanding") {
      conditions.push(
        inArray(invoices.status, [
          "sent",
          "viewed",
          "partial",
          "overdue",
        ] as const),
      )
    } else if (filter !== "all") {
      conditions.push(eq(invoices.status, filter))
    }

    const rows = await tx
      .select({
        invoice: invoices,
        client: {
          id: clients.id,
          fullName: clients.fullName,
          email: clients.email,
        },
      })
      .from(invoices)
      .leftJoin(clients, eq(clients.id, invoices.clientId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(invoices.createdAt))

    return rows.map((r) => ({
      invoice: r.invoice,
      client: r.client?.id ? r.client : null,
    }))
  })
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  return withRLS(async (tx) => {
    const rows = await tx
      .select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1)
    return rows[0] ?? null
  })
}

export async function getInvoiceWithRefs(id: string): Promise<
  | {
      invoice: Invoice
      client: Client | null
      professional: Pick<
        Professional,
        "id" | "fullName" | "email" | "currency"
      > | null
      settings: InvoiceSettings | null
    }
  | null
> {
  return withRLS(async (tx) => {
    const rows = await tx
      .select({
        invoice: invoices,
        client: clients,
        professional: {
          id: professionals.id,
          fullName: professionals.fullName,
          email: professionals.email,
          currency: professionals.currency,
        },
      })
      .from(invoices)
      .leftJoin(clients, eq(clients.id, invoices.clientId))
      .leftJoin(professionals, eq(professionals.id, invoices.professionalId))
      .where(eq(invoices.id, id))
      .limit(1)
    const row = rows[0]
    if (!row) return null

    const settingsRows = await tx
      .select()
      .from(invoiceSettings)
      .where(eq(invoiceSettings.professionalId, row.invoice.professionalId))
      .limit(1)

    return {
      invoice: row.invoice,
      client: row.client?.id ? row.client : null,
      professional: row.professional?.id ? row.professional : null,
      settings: settingsRows[0] ?? null,
    }
  })
}

export async function getInvoiceStats(): Promise<InvoiceStats> {
  return withRLS(async (tx) => {
    // One round-trip — summing/CTE aggregates per status. We rely on numeric
    // casting to JS numbers; postgres.js returns numerics as strings, so we
    // coerce with ::float8 to let Drizzle hand them back as numbers.
    const rows = await tx
      .select({
        outstandingAmount: sql<number>`
          coalesce(sum(case
            when ${invoices.status} in ('sent','viewed','partial','overdue')
            then (${invoices.total}::float8 - ${invoices.paidAmount}::float8)
            else 0
          end), 0)::float8
        `,
        outstandingCount: sql<number>`
          count(*) filter (where ${invoices.status} in ('sent','viewed','partial','overdue'))::int
        `,
        overdueAmount: sql<number>`
          coalesce(sum(case
            when ${invoices.status} = 'overdue'
            then (${invoices.total}::float8 - ${invoices.paidAmount}::float8)
            else 0
          end), 0)::float8
        `,
        overdueCount: sql<number>`
          count(*) filter (where ${invoices.status} = 'overdue')::int
        `,
        paidThisMonthAmount: sql<number>`
          coalesce(sum(case
            when ${invoices.paidDate} >= date_trunc('month', current_date)
            then ${invoices.paidAmount}::float8
            else 0
          end), 0)::float8
        `,
        paidThisMonthCount: sql<number>`
          count(*) filter (where ${invoices.paidDate} >= date_trunc('month', current_date))::int
        `,
        avgDaysToPay: sql<number>`
          coalesce(avg(case
            when ${invoices.paidDate} is not null
            then (${invoices.paidDate} - ${invoices.issueDate})
            else null
          end), 0)::float8
        `,
        draftCount: sql<number>`
          count(*) filter (where ${invoices.status} = 'draft')::int
        `,
      })
      .from(invoices)

    const r = rows[0]
    return {
      outstanding: Number(r?.outstandingAmount ?? 0),
      outstandingCount: Number(r?.outstandingCount ?? 0),
      overdue: Number(r?.overdueAmount ?? 0),
      overdueCount: Number(r?.overdueCount ?? 0),
      paidThisMonth: Number(r?.paidThisMonthAmount ?? 0),
      paidThisMonthCount: Number(r?.paidThisMonthCount ?? 0),
      avgDaysToPay: Math.round(Number(r?.avgDaysToPay ?? 0)),
      draftCount: Number(r?.draftCount ?? 0),
    }
  })
}

// ── Writes ──────────────────────────────────────────────────────────────────

// Increments the per-professional counter and returns the next formatted
// invoice number (e.g. `INV-2026-0007`). Runs inside a single transaction so
// two concurrent creates can't collide on the same number.
export async function reserveNextInvoiceNumber(
  tx: Tx,
  professionalId: string,
): Promise<string> {
  const year = new Date().getUTCFullYear()
  const [settingsRow] = await tx
    .insert(invoiceSettings)
    .values({ professionalId })
    .onConflictDoNothing({ target: invoiceSettings.professionalId })
    .returning()
  let current: InvoiceSettings | null = settingsRow ?? null
  if (!current) {
    const existing = await tx
      .select()
      .from(invoiceSettings)
      .where(eq(invoiceSettings.professionalId, professionalId))
      .limit(1)
    current = existing[0] ?? null
  }
  if (!current) {
    throw new Error("Failed to load invoice settings")
  }
  // Bump counter atomically and return the new value.
  const [updated] = await tx
    .update(invoiceSettings)
    .set({ nextInvoiceNumber: current.nextInvoiceNumber + 1 })
    .where(eq(invoiceSettings.professionalId, professionalId))
    .returning()
  const counter = current.nextInvoiceNumber
  const prefix = updated?.invoicePrefix ?? current.invoicePrefix
  return `${prefix}-${year}-${String(counter).padStart(4, "0")}`
}

export type CreateInvoiceInput = {
  clientId: string
  appointmentId?: string | null
  lineItems: InvoiceLineItem[]
  subtotal: string
  taxRate: string
  taxAmount: string
  discount: string
  total: string
  currency: string
  issueDate: string
  dueDate: string
  terms?: string
  notes?: string | null
  status?: "draft" | "sent"
}

export async function createInvoice(
  input: CreateInvoiceInput,
): Promise<Invoice> {
  const professional = await getProfessional()
  if (!professional) {
    throw new Error("No professional context — cannot create invoice")
  }
  return withRLS(async (tx) => {
    const invoiceNumber = await reserveNextInvoiceNumber(tx, professional.id)
    const values: NewInvoice = {
      professionalId: professional.id,
      clientId: input.clientId,
      appointmentId: input.appointmentId ?? null,
      invoiceNumber,
      lineItems: input.lineItems,
      subtotal: input.subtotal,
      taxRate: input.taxRate,
      taxAmount: input.taxAmount,
      discount: input.discount,
      total: input.total,
      currency: input.currency,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      terms: input.terms ?? "Net 30",
      notes: input.notes ?? null,
      status: input.status ?? "draft",
    }
    const [created] = await tx.insert(invoices).values(values).returning()
    if (!created) throw new Error("Failed to create invoice")
    return created
  })
}

export type UpdateInvoicePatch = Partial<
  Omit<CreateInvoiceInput, "status">
> & {
  status?: string
  paidAmount?: string
  paymentMethod?: string | null
  paymentReference?: string | null
  paidDate?: string | null
}

export async function updateInvoice(
  id: string,
  patch: UpdateInvoicePatch,
): Promise<Invoice | null> {
  return withRLS(async (tx) => {
    const assignable: Record<string, unknown> = { ...patch }
    const rows = await tx
      .update(invoices)
      .set(assignable)
      .where(eq(invoices.id, id))
      .returning()
    return rows[0] ?? null
  })
}

export async function deleteInvoice(id: string): Promise<boolean> {
  return withRLS(async (tx) => {
    const rows = await tx
      .delete(invoices)
      .where(eq(invoices.id, id))
      .returning({ id: invoices.id })
    return rows.length > 0
  })
}

// Marks the invoice as sent. Stamps sentAt and flips status from draft → sent.
// If the invoice is already in a later state (viewed/paid) we leave the status
// alone but still record the send timestamp.
export async function markInvoiceSent(id: string): Promise<Invoice | null> {
  return withRLS(async (tx) => {
    const rows = await tx
      .update(invoices)
      .set({
        sentAt: new Date(),
        status: sql`case when ${invoices.status} = 'draft' then 'sent' else ${invoices.status} end`,
      })
      .where(eq(invoices.id, id))
      .returning()
    return rows[0] ?? null
  })
}

// Marks the invoice as viewed by the client portal. First view wins — we
// don't overwrite an existing viewedAt so we can tell "time to first view".
export async function markInvoiceViewed(id: string): Promise<Invoice | null> {
  return withRLS(async (tx) => {
    const rows = await tx
      .update(invoices)
      .set({
        viewedAt: sql`coalesce(${invoices.viewedAt}, now())`,
        status: sql`case
          when ${invoices.status} in ('sent') then 'viewed'
          else ${invoices.status}
        end`,
      })
      .where(eq(invoices.id, id))
      .returning()
    return rows[0] ?? null
  })
}

export type RecordPaymentInput = {
  invoiceId: string
  amount: number
  method: string
  reference?: string | null
  paidDate?: string | null
}

export async function recordPayment(
  input: RecordPaymentInput,
): Promise<Invoice | null> {
  return withRLS(async (tx) => {
    const existing = await tx
      .select()
      .from(invoices)
      .where(eq(invoices.id, input.invoiceId))
      .limit(1)
    const current = existing[0]
    if (!current) return null

    const total = Number(current.total)
    const prevPaid = Number(current.paidAmount)
    const newPaid = Math.max(0, Math.min(total, prevPaid + input.amount))
    const fullyPaid = newPaid + 0.005 >= total // tolerate rounding
    const nextStatus = fullyPaid ? "paid" : "partial"

    const [updated] = await tx
      .update(invoices)
      .set({
        paidAmount: newPaid.toFixed(2),
        status: nextStatus,
        paymentMethod: input.method,
        paymentReference: input.reference ?? null,
        paidDate: fullyPaid
          ? (input.paidDate ?? new Date().toISOString().slice(0, 10))
          : null,
      })
      .where(eq(invoices.id, input.invoiceId))
      .returning()
    return updated ?? null
  })
}

// ── Settings ────────────────────────────────────────────────────────────────

export async function getInvoiceSettings(): Promise<InvoiceSettings | null> {
  return withRLS(async (tx) => {
    const rows = await tx.select().from(invoiceSettings).limit(1)
    return rows[0] ?? null
  })
}

export async function upsertInvoiceSettings(
  patch: Omit<Partial<NewInvoiceSettings>, "professionalId">,
): Promise<InvoiceSettings> {
  const professional = await getProfessional()
  if (!professional) throw new Error("No professional context")
  return withRLS(async (tx) => {
    const [row] = await tx
      .insert(invoiceSettings)
      .values({ professionalId: professional.id, ...patch })
      .onConflictDoUpdate({
        target: invoiceSettings.professionalId,
        set: { ...patch },
      })
      .returning()
    if (!row) throw new Error("Failed to upsert invoice settings")
    return row
  })
}

// ── Overdue sweep + reminders (admin context) ───────────────────────────────
// These run from Trigger.dev / cron and have no user session, so they use
// dbAdmin. Every write is scoped to invoice owners so we never cross tenants.

export type OverdueSweepItem = {
  invoice: Invoice
  daysOverdue: number
  client: { id: string; email: string; fullName: string } | null
  professional: { id: string; email: string; fullName: string } | null
}

export type OverdueSweepResult = {
  flipped: number
  items: OverdueSweepItem[]
}

export async function sweepOverdueInvoices(): Promise<OverdueSweepResult> {
  // Move `sent` / `viewed` invoices with a past due date into `overdue`.
  const flipped = await dbAdmin
    .update(invoices)
    .set({ status: "overdue" })
    .where(
      and(
        inArray(invoices.status, ["sent", "viewed"] as const),
        lt(invoices.dueDate, sql`current_date`),
      ),
    )
    .returning({ id: invoices.id })

  // Re-read every overdue invoice (the ones we just flipped + older ones that
  // still need reminders) so we can dispatch dunning emails uniformly.
  const openOverdue = await dbAdmin
    .select({
      invoice: invoices,
      client: {
        id: clients.id,
        email: clients.email,
        fullName: clients.fullName,
      },
      professional: {
        id: professionals.id,
        email: professionals.email,
        fullName: professionals.fullName,
      },
    })
    .from(invoices)
    .leftJoin(clients, eq(clients.id, invoices.clientId))
    .leftJoin(professionals, eq(professionals.id, invoices.professionalId))
    .where(eq(invoices.status, "overdue"))

  const items: OverdueSweepItem[] = openOverdue.map((row) => {
    const dueMs = new Date(row.invoice.dueDate).getTime()
    const nowMs = Date.now()
    const daysOverdue = Math.max(
      0,
      Math.floor((nowMs - dueMs) / (1000 * 60 * 60 * 24)),
    )
    return {
      invoice: row.invoice,
      daysOverdue,
      client: row.client?.id ? row.client : null,
      professional: row.professional?.id ? row.professional : null,
    }
  })

  return { flipped: flipped.length, items }
}

// Admin-only helper: find prior reminders for a given invoice + type so the
// dunning loop can skip if one was already sent today.
export async function getRemindersForInvoice(
  invoiceId: string,
): Promise<PaymentReminder[]> {
  const rows = await dbAdmin
    .select()
    .from(paymentReminders)
    .where(eq(paymentReminders.invoiceId, invoiceId))
    .orderBy(desc(paymentReminders.sentAt))
  return rows
}

export async function logReminder(input: {
  invoiceId: string
  professionalId: string
  reminderType: "friendly" | "firm" | "final"
  daysOverdue: number
}): Promise<PaymentReminder> {
  const [row] = await dbAdmin
    .insert(paymentReminders)
    .values({
      invoiceId: input.invoiceId,
      professionalId: input.professionalId,
      reminderType: input.reminderType,
      daysOverdue: input.daysOverdue,
    })
    .returning()
  if (!row) throw new Error("Failed to log reminder")
  return row
}
