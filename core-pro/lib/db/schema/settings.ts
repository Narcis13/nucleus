import { sql } from "drizzle-orm"
import { jsonb, pgPolicy, pgTable, uuid } from "drizzle-orm/pg-core"
import { authenticatedRole } from "drizzle-orm/supabase"

import { createdAt, currentProfessionalIdSql, updatedAt } from "./_helpers"
import { professionals } from "./professionals"

// ============================================================================
// PROFESSIONAL_SETTINGS — 1:1 with a professional. Holds notification prefs,
// calendar sync, integration tokens, GDPR config, and niche-specific settings.
// ============================================================================
export const professionalSettings = pgTable(
  "professional_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalId: uuid("professional_id")
      .notNull()
      .unique()
      .references(() => professionals.id, { onDelete: "cascade" }),
    notificationPreferences: jsonb("notification_preferences"),
    calendarSync: jsonb("calendar_sync"),
    integrations: jsonb("integrations"),
    gdprSettings: jsonb("gdpr_settings"),
    metadata: jsonb("metadata"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    pgPolicy("professional_settings_owner_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
      withCheck: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
    }),
  ],
)
