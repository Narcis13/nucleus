import { sql } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgPolicy,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core"
import { anonRole, authenticatedRole } from "drizzle-orm/supabase"

import { createdAt, currentProfessionalIdSql } from "./_helpers"
import { professionals } from "./professionals"

// ============================================================================
// SERVICES — the professional's offerings (with price/duration).
// Public SELECT is allowed so micro-sites can list active services.
// ============================================================================
export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    price: numeric("price", { precision: 10, scale: 2 }),
    currency: text("currency").default("EUR").notNull(),
    durationMinutes: integer("duration_minutes"),
    isActive: boolean("is_active").default(true).notNull(),
    metadata: jsonb("metadata"),
    createdAt: createdAt(),
  },
  (t) => [
    index("services_professional_id_idx").on(t.professionalId),

    pgPolicy("services_professional_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
      withCheck: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
    }),
    // Anonymous micro-site visitors must be able to list active services.
    pgPolicy("services_public_select", {
      for: "select",
      to: [anonRole, authenticatedRole],
      using: sql`${t.isActive} = true`,
    }),
  ],
)
