import { sql } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core"
import { authenticatedRole } from "drizzle-orm/supabase"

import { createdAt, currentProfessionalIdSql, updatedAt } from "./_helpers"
import { clients } from "./clients"
import { professionals } from "./professionals"

// ============================================================================
// LEAD PIPELINE — customizable stages + lead cards + timeline of activities.
// ============================================================================
export const leadStages = pgTable(
  "lead_stages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    color: text("color"),
    isDefault: boolean("is_default").default(false).notNull(),
    isWon: boolean("is_won").default(false).notNull(),
    isLost: boolean("is_lost").default(false).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("lead_stages_professional_id_idx").on(t.professionalId),
    index("lead_stages_position_idx").on(t.professionalId, t.position),

    pgPolicy("lead_stages_professional_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
      withCheck: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
    }),
  ],
)

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => leadStages.id, { onDelete: "restrict" }),
    fullName: text("full_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    source: text("source"),
    score: integer("score").default(0).notNull(),
    notes: text("notes"),
    metadata: jsonb("metadata"),
    convertedClientId: uuid("converted_client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("leads_professional_id_idx").on(t.professionalId),
    index("leads_stage_id_idx").on(t.stageId),

    pgPolicy("leads_professional_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
      withCheck: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
    }),
  ],
)

export const leadActivities = pgTable(
  "lead_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    description: text("description"),
    metadata: jsonb("metadata"),
    createdAt: createdAt(),
  },
  (t) => [
    index("lead_activities_lead_id_idx").on(t.leadId),

    pgPolicy("lead_activities_professional_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.leadId} in (select id from public.leads where professional_id = ${currentProfessionalIdSql})`,
      withCheck: sql`${t.leadId} in (select id from public.leads where professional_id = ${currentProfessionalIdSql})`,
    }),
  ],
)
