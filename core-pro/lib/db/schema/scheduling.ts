import { sql } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { authenticatedRole } from "drizzle-orm/supabase"

import { createdAt, currentProfessionalIdSql } from "./_helpers"
import { clients } from "./clients"
import { professionals } from "./professionals"
import { services } from "./services"

// ============================================================================
// AVAILABILITY + APPOINTMENTS — scheduling.
// Clients can read their own appointments via a separate policy.
// ============================================================================
export const availabilitySlots = pgTable(
  "availability_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
  },
  (t) => [
    index("availability_slots_professional_id_idx").on(t.professionalId),

    pgPolicy("availability_slots_professional_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
      withCheck: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
    }),
  ],
)

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    serviceId: uuid("service_id").references(() => services.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    status: text("status").default("scheduled").notNull(),
    location: text("location"),
    type: text("type").default("in_person").notNull(),
    notes: text("notes"),
    metadata: jsonb("metadata"),
    externalCalendarId: text("external_calendar_id"),
    createdAt: createdAt(),
  },
  (t) => [
    index("appointments_professional_id_idx").on(t.professionalId),
    index("appointments_client_id_idx").on(t.clientId),
    index("appointments_start_at_idx").on(t.startAt),

    pgPolicy("appointments_professional_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
      withCheck: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
    }),
    pgPolicy("appointments_client_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.clientId} in (select id from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub'))`,
    }),
  ],
)
