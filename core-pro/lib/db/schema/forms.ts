import { sql } from "drizzle-orm"
import {
  boolean,
  index,
  jsonb,
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
} from "./_helpers"
import { clients } from "./clients"
import { professionals } from "./professionals"

// ============================================================================
// FORMS — schema-defined questionnaires. Assignments link forms to clients.
// Responses are immutable submissions.
// ============================================================================
export const forms = pgTable(
  "forms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    schema: jsonb("schema").notNull(),
    isTemplate: boolean("is_template").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("forms_professional_id_idx").on(t.professionalId),

    pgPolicy("forms_professional_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
      withCheck: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
    }),
    // Clients need to SELECT a form to fill it — only when it's assigned to them.
    pgPolicy("forms_client_select_assigned", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.id} in (
        select form_id from public.form_assignments
        where client_id in (select id from public.clients where clerk_user_id = ${currentClerkUserId})
      )`,
    }),
  ],
)

export const formAssignments = pgTable(
  "form_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    status: text("status").default("pending").notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("form_assignments_form_id_idx").on(t.formId),
    index("form_assignments_client_id_idx").on(t.clientId),
    index("form_assignments_professional_id_idx").on(t.professionalId),

    pgPolicy("form_assignments_professional_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
      withCheck: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
    }),
    pgPolicy("form_assignments_client_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.clientId} in (select id from public.clients where clerk_user_id = ${currentClerkUserId})`,
    }),
    pgPolicy("form_assignments_client_update", {
      for: "update",
      to: authenticatedRole,
      using: sql`${t.clientId} in (select id from public.clients where clerk_user_id = ${currentClerkUserId})`,
      withCheck: sql`${t.clientId} in (select id from public.clients where clerk_user_id = ${currentClerkUserId})`,
    }),
  ],
)

export const formResponses = pgTable(
  "form_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    assignmentId: uuid("assignment_id").references(() => formAssignments.id, {
      onDelete: "set null",
    }),
    data: jsonb("data").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("form_responses_form_id_idx").on(t.formId),
    index("form_responses_client_id_idx").on(t.clientId),

    // Professional can read responses to their own forms.
    pgPolicy("form_responses_professional_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.formId} in (select id from public.forms where professional_id = ${currentProfessionalIdSql})`,
    }),
    // Client can insert + read their own responses.
    pgPolicy("form_responses_client_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${t.clientId} in (select id from public.clients where clerk_user_id = ${currentClerkUserId})`,
    }),
    pgPolicy("form_responses_client_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.clientId} in (select id from public.clients where clerk_user_id = ${currentClerkUserId})`,
    }),
  ],
)
