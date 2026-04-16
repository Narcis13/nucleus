import { sql } from "drizzle-orm"
import {
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { authenticatedRole } from "drizzle-orm/supabase"

import {
  createdAt,
  currentClerkUserId,
  currentProfessionalIdSql,
  updatedAt,
} from "./_helpers"
import { appointments } from "./scheduling"
import { clients } from "./clients"
import { professionals } from "./professionals"
import { services } from "./services"

// ============================================================================
// INVOICES — cash-flow tracking. No payment *processing* (Stripe handles that
// for subscription billing); this table records what was issued, what has been
// received against each invoice, and when it was marked paid.
//
// Line items live in `line_items` (jsonb) rather than a separate child table:
// invoices are tens-of-lines, we never query across line-item rows, and
// editing the invoice replaces the whole document. Keeping them inline means
// a single row is a single invoice snapshot.
// ============================================================================
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    // Optional link to the appointment that generated the invoice (the "job"
    // in the spec). Set null on delete so cancelled appointments don't wipe
    // invoices.
    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "set null",
    }),
    // Legacy single-service link retained from earlier migrations. Line items
    // supersede this for billing; kept so prior rows & any future "quick
    // invoice from service" flow still resolve.
    serviceId: uuid("service_id").references(() => services.id, {
      onDelete: "set null",
    }),

    invoiceNumber: text("invoice_number").notNull(),

    // Tiny array of `{ description, quantity, unit_price, amount }` rows.
    // Shape validated in the server action, not in the DB — jsonb keeps
    // editing cheap.
    lineItems: jsonb("line_items").default(sql`'[]'::jsonb`).notNull(),

    subtotal: numeric("subtotal", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    taxRate: numeric("tax_rate", { precision: 5, scale: 2 })
      .default("0")
      .notNull(),
    taxAmount: numeric("tax_amount", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    discount: numeric("discount", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    total: numeric("total", { precision: 10, scale: 2 }).default("0").notNull(),
    currency: text("currency").default("EUR").notNull(),

    // draft | sent | viewed | partial | paid | overdue | void
    status: text("status").default("draft").notNull(),
    paidAmount: numeric("paid_amount", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    paymentMethod: text("payment_method"), // cash, check, venmo, zelle, credit_card, other
    paymentReference: text("payment_reference"),

    issueDate: date("issue_date").default(sql`CURRENT_DATE`).notNull(),
    dueDate: date("due_date").default(sql`CURRENT_DATE`).notNull(),
    paidDate: date("paid_date"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),

    notes: text("notes"),
    terms: text("terms").default("Net 30").notNull(),
    metadata: jsonb("metadata"),

    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("invoices_professional_id_idx").on(t.professionalId),
    index("invoices_client_id_idx").on(t.clientId),
    index("invoices_status_idx").on(t.professionalId, t.status),
    index("invoices_due_date_idx").on(t.dueDate),

    pgPolicy("invoices_professional_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
      withCheck: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
    }),
    pgPolicy("invoices_client_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.clientId} in (select id from public.clients where clerk_user_id = ${currentClerkUserId})`,
    }),
  ],
)

// ============================================================================
// INVOICE_SETTINGS — one row per professional. The pk IS the professional id
// so there is never any ambiguity about "which settings" apply.
// ============================================================================
export const invoiceSettings = pgTable(
  "invoice_settings",
  {
    professionalId: uuid("professional_id")
      .primaryKey()
      .references(() => professionals.id, { onDelete: "cascade" }),
    nextInvoiceNumber: integer("next_invoice_number").default(1).notNull(),
    invoicePrefix: text("invoice_prefix").default("INV").notNull(),
    defaultDueDays: integer("default_due_days").default(30).notNull(),
    defaultTerms: text("default_terms").default("Net 30").notNull(),
    defaultNotes: text("default_notes"),
    taxRate: numeric("tax_rate", { precision: 5, scale: 2 })
      .default("0")
      .notNull(),
    logoUrl: text("logo_url"),
    // address / phone / email / website — kept loose so UI can evolve.
    companyInfo: jsonb("company_info"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    pgPolicy("invoice_settings_professional_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
      withCheck: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
    }),
  ],
)

// ============================================================================
// PAYMENT_REMINDERS — audit trail for dunning emails. One row per send attempt
// so we can avoid double-sending the same tier on the same day.
// ============================================================================
export const paymentReminders = pgTable(
  "payment_reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    reminderType: text("reminder_type").notNull(), // friendly | firm | final
    daysOverdue: integer("days_overdue").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("payment_reminders_invoice_idx").on(t.invoiceId),
    index("payment_reminders_professional_idx").on(t.professionalId),

    pgPolicy("payment_reminders_professional_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
      withCheck: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
    }),
  ],
)
