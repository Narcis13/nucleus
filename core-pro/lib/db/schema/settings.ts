import { sql } from "drizzle-orm"
import { jsonb, pgPolicy, pgTable, uuid } from "drizzle-orm/pg-core"
import { authenticatedRole } from "drizzle-orm/supabase"

import {
  createdAt,
  currentClerkUserId,
  currentProfessionalIdSql,
  updatedAt,
} from "./_helpers"
import { clients } from "./clients"
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

// ============================================================================
// CLIENT_SETTINGS — 1:1 with a client. Currently carries only the
// notification preferences jsonb, but scoped under a dedicated table so we can
// add portal-specific settings (language, reminders cadence, …) without
// touching the `clients` row and re-running RLS on every signup path.
// ============================================================================
export const clientSettings = pgTable(
  "client_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .unique()
      .references(() => clients.id, { onDelete: "cascade" }),
    notificationPreferences: jsonb("notification_preferences"),
    metadata: jsonb("metadata"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    pgPolicy("client_settings_self_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.clientId} in (select id from public.clients where clerk_user_id = ${currentClerkUserId})`,
      withCheck: sql`${t.clientId} in (select id from public.clients where clerk_user_id = ${currentClerkUserId})`,
    }),
  ],
)
