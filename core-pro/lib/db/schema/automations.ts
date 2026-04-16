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

import { createdAt, currentProfessionalIdSql } from "./_helpers"
import { professionals } from "./professionals"

// ============================================================================
// AUTOMATIONS — trigger + action config authored per professional.
// Logs record each automation firing for audit + debug.
// ============================================================================
export const automations = pgTable(
  "automations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    triggerType: text("trigger_type").notNull(),
    triggerConfig: jsonb("trigger_config"),
    actions: jsonb("actions").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("automations_professional_id_idx").on(t.professionalId),

    pgPolicy("automations_professional_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
      withCheck: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
    }),
  ],
)

export const automationLogs = pgTable(
  "automation_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    automationId: uuid("automation_id")
      .notNull()
      .references(() => automations.id, { onDelete: "cascade" }),
    targetId: uuid("target_id"),
    status: text("status"),
    executedAt: timestamp("executed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    error: text("error"),
  },
  (t) => [
    index("automation_logs_automation_id_idx").on(t.automationId),

    pgPolicy("automation_logs_professional_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.automationId} in (select id from public.automations where professional_id = ${currentProfessionalIdSql})`,
    }),
  ],
)
