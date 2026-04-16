import { sql } from "drizzle-orm"
import {
  date,
  index,
  jsonb,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core"
import { authenticatedRole } from "drizzle-orm/supabase"

import {
  createdAt,
  currentClerkUserId,
  currentProfessionalIdSql,
  updatedAt,
} from "./_helpers"
import { professionals } from "./professionals"

// ============================================================================
// CLIENTS — free users; access granted via invitation. `clerk_user_id` is
// populated once the client accepts the Clerk org invitation.
// ============================================================================
export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").unique(),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    phone: text("phone"),
    avatarUrl: text("avatar_url"),
    dateOfBirth: date("date_of_birth"),
    locale: text("locale").default("ro").notNull(),
    metadata: jsonb("metadata"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("clients_clerk_user_id_idx").on(t.clerkUserId),
    index("clients_email_idx").on(t.email),

    // Professional can see clients linked to them via professional_clients.
    pgPolicy("clients_professional_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.id} in (
        select client_id from public.professional_clients
        where professional_id = ${currentProfessionalIdSql}
      )`,
    }),
    pgPolicy("clients_professional_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`true`,
    }),
    pgPolicy("clients_professional_update", {
      for: "update",
      to: authenticatedRole,
      using: sql`${t.id} in (
        select client_id from public.professional_clients
        where professional_id = ${currentProfessionalIdSql}
      )`,
      withCheck: sql`${t.id} in (
        select client_id from public.professional_clients
        where professional_id = ${currentProfessionalIdSql}
      )`,
    }),
    // Client can read and update their own row.
    pgPolicy("clients_self_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.clerkUserId} = ${currentClerkUserId}`,
    }),
    pgPolicy("clients_self_update", {
      for: "update",
      to: authenticatedRole,
      using: sql`${t.clerkUserId} = ${currentClerkUserId}`,
      withCheck: sql`${t.clerkUserId} = ${currentClerkUserId}`,
    }),
  ],
)

// ============================================================================
// PROFESSIONAL ↔ CLIENT relationship (junction)
// ============================================================================
export const professionalClients = pgTable(
  "professional_clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    status: text("status").default("active").notNull(),
    role: text("role").default("client").notNull(),
    source: text("source"),
    startDate: date("start_date").default(sql`CURRENT_DATE`).notNull(),
    endDate: date("end_date"),
    notes: text("notes"),
    metadata: jsonb("metadata"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("professional_clients_unique").on(t.professionalId, t.clientId),
    index("professional_clients_professional_id_idx").on(t.professionalId),
    index("professional_clients_client_id_idx").on(t.clientId),

    pgPolicy("professional_clients_professional_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
      withCheck: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
    }),
    pgPolicy("professional_clients_client_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.clientId} in (select id from public.clients where clerk_user_id = ${currentClerkUserId})`,
    }),
  ],
)

// ============================================================================
// TAGS & SEGMENTATION
// ============================================================================
export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").default("#6366f1").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("tags_professional_name_unique").on(t.professionalId, t.name),
    index("tags_professional_id_idx").on(t.professionalId),

    pgPolicy("tags_professional_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
      withCheck: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
    }),
  ],
)

export const clientTags = pgTable(
  "client_tags",
  {
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.clientId, t.tagId] }),

    // A client_tag is visible/mutable when the tag belongs to the current
    // professional (owning a tag implies owning the link).
    pgPolicy("client_tags_professional_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.tagId} in (select id from public.tags where professional_id = ${currentProfessionalIdSql})`,
      withCheck: sql`${t.tagId} in (select id from public.tags where professional_id = ${currentProfessionalIdSql})`,
    }),
  ],
)
