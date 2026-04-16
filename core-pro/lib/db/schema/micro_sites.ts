import { sql } from "drizzle-orm"
import {
  boolean,
  index,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core"
import { anonRole, authenticatedRole } from "drizzle-orm/supabase"

import { createdAt, currentProfessionalIdSql, updatedAt } from "./_helpers"
import { professionals } from "./professionals"

// ============================================================================
// MICRO-SITES — one per professional. Published sites are publicly readable
// (anon + authenticated roles) so the public slug route can SSG them.
// ============================================================================
export const microSites = pgTable(
  "micro_sites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalId: uuid("professional_id")
      .notNull()
      .unique()
      .references(() => professionals.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    customDomain: text("custom_domain"),
    isPublished: boolean("is_published").default(false).notNull(),
    theme: text("theme").default("default").notNull(),
    sections: jsonb("sections"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    socialLinks: jsonb("social_links"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("micro_sites_slug_idx").on(t.slug),

    pgPolicy("micro_sites_owner_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
      withCheck: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
    }),
    pgPolicy("micro_sites_public_select", {
      for: "select",
      to: [anonRole, authenticatedRole],
      using: sql`${t.isPublished} = true`,
    }),
  ],
)

// ============================================================================
// MARKETING ASSETS — social posts, email templates, brochures, lead magnets.
// ============================================================================
export const marketingAssets = pgTable(
  "marketing_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    name: text("name").notNull(),
    content: jsonb("content"),
    fileUrl: text("file_url"),
    status: text("status").default("draft").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("marketing_assets_professional_id_idx").on(t.professionalId),

    pgPolicy("marketing_assets_professional_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
      withCheck: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
    }),
  ],
)

