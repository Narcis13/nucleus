import { sql } from "drizzle-orm"
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
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
import { appointments } from "./scheduling"

// Postgres `bytea` mapped to Node Buffer — used for sha256 of the raw share
// token, so the raw token never lands at rest.
const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea"
  },
})

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

// ============================================================================
// FORM_PUBLIC_SHARES — single-use (or capped) tokenized links so non-clients
// (e.g. property viewers) can fill out a form without a portal session. The
// raw token lives only in the URL; we store sha256(token) so a DB leak can't
// be replayed. Submissions land in form_responses with `client_id` NULL and
// `subject_client_id` set so the subject (e.g. apartment owner) can read.
//
// RLS: pro-only. Public submission goes through the service-role (`dbAdmin`)
// connection — RLS denies-by-default for the `authenticated` role.
// ============================================================================
export const formPublicShares = pgTable(
  "form_public_shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    subjectClientId: uuid("subject_client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    subjectAppointmentId: uuid("subject_appointment_id").references(
      () => appointments.id,
      { onDelete: "set null" },
    ),
    tokenHash: bytea("token_hash").notNull(),
    maxResponses: integer("max_responses").notNull().default(1),
    responseCount: integer("response_count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("form_public_shares_token_hash_idx").on(t.tokenHash),
    index("form_public_shares_form_id_idx").on(t.formId),
    index("form_public_shares_subject_client_id_idx").on(t.subjectClientId),

    pgPolicy("form_public_shares_professional_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
      withCheck: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
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
    // Nullable now: a public-share submission has no client_id (the filler is
    // an anonymous third party). Still NOT NULL conceptually for portal/Clerk
    // submissions — enforced upstream in those services.
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "cascade",
    }),
    assignmentId: uuid("assignment_id").references(() => formAssignments.id, {
      onDelete: "set null",
    }),
    // Set when this response came in via a public share. Decoupled from
    // assignmentId because a share has no assignment.
    shareId: uuid("share_id").references(() => formPublicShares.id, {
      onDelete: "set null",
    }),
    // The client this response is *about* (e.g. apartment owner whose property
    // a viewer just rated). Powers the owner-side "surveys about me" view.
    subjectClientId: uuid("subject_client_id").references(() => clients.id, {
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
    index("form_responses_subject_client_id_idx").on(t.subjectClientId),
    index("form_responses_share_id_idx").on(t.shareId),

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
    // Subject client (e.g. apartment owner) can read responses attributed to
    // them via subject_client_id. Additive to the policies above.
    pgPolicy("form_responses_subject_client_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.subjectClientId} in (select id from public.clients where clerk_user_id = ${currentClerkUserId})`,
    }),
  ],
)
