import { sql } from "drizzle-orm"
import {
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
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
// DOCUMENTS — files stored in Supabase Storage; rows act as metadata index.
// Scoped to the professional; optionally linked to a client (visible in portal).
// ============================================================================
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    uploadedBy: uuid("uploaded_by").notNull(),
    name: text("name").notNull(),
    fileUrl: text("file_url").notNull(),
    fileType: text("file_type"),
    fileSize: integer("file_size"),
    category: text("category"),
    metadata: jsonb("metadata"),
    createdAt: createdAt(),
  },
  (t) => [
    index("documents_professional_id_idx").on(t.professionalId),
    index("documents_client_id_idx").on(t.clientId),

    pgPolicy("documents_professional_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
      withCheck: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
    }),
    // Client sees documents addressed to them.
    pgPolicy("documents_client_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.clientId} in (select id from public.clients where clerk_user_id = ${currentClerkUserId})`,
    }),
    pgPolicy("documents_client_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${t.clientId} in (select id from public.clients where clerk_user_id = ${currentClerkUserId})`,
    }),
  ],
)
