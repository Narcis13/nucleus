import { sql } from "drizzle-orm"
import {
  date,
  index,
  jsonb,
  numeric,
  pgPolicy,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core"
import { authenticatedRole } from "drizzle-orm/supabase"

import {
  createdAt,
  currentClerkUserId,
  currentProfessionalIdSql,
} from "./_helpers"
import { clients } from "./clients"
import { professionals } from "./professionals"
import { services } from "./services"

// ============================================================================
// INVOICES — tracked only (no payment processing; Stripe handles that).
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
    serviceId: uuid("service_id").references(() => services.id, {
      onDelete: "set null",
    }),
    invoiceNumber: text("invoice_number").notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").default("EUR").notNull(),
    status: text("status").default("unpaid").notNull(),
    issuedAt: date("issued_at").default(sql`CURRENT_DATE`).notNull(),
    dueAt: date("due_at"),
    paidAt: date("paid_at"),
    notes: text("notes"),
    metadata: jsonb("metadata"),
    createdAt: createdAt(),
  },
  (t) => [
    index("invoices_professional_id_idx").on(t.professionalId),
    index("invoices_client_id_idx").on(t.clientId),
    index("invoices_status_idx").on(t.professionalId, t.status),

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
