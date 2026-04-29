import {
  index,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core"

import { createdAt } from "./_helpers"

// ============================================================================
// ERROR_LOGS — structured sink for server-side errors and warnings. Written
// only via `lib/audit/log.ts` using `dbAdmin`; fallback to console if the
// insert fails. RLS is enabled with no permissive policy so user-scoped
// queries cannot read it — read access is server-only (admin tooling, ops
// queries, future drains to Logtail/Vercel).
// ============================================================================
export const errorLogs = pgTable(
  "error_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    level: text("level").notNull(), // 'error' | 'warn' | 'info'
    source: text("source").notNull(), // e.g. 'action:createClient', 'webhook:stripe'
    message: text("message").notNull(),
    stack: text("stack"),
    professionalId: uuid("professional_id"),
    clientId: uuid("client_id"),
    metadata: jsonb("metadata"),
    createdAt: createdAt(),
  },
  (t) => [
    index("error_logs_level_created_at_idx").on(t.level, t.createdAt),
    index("error_logs_source_created_at_idx").on(t.source, t.createdAt),
    index("error_logs_professional_created_at_idx").on(
      t.professionalId,
      t.createdAt,
    ),
  ],
).enableRLS()
