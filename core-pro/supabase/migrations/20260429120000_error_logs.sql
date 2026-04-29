-- ─────────────────────────────────────────────────────────────────────────────
-- error_logs — structured sink for server-side errors and warnings.
--
-- Written exclusively by lib/audit/log.ts (via dbAdmin). RLS is enabled with
-- no permissive policy so authenticated client requests cannot read or write
-- the table; only server-role connections (webhooks, cron, server actions
-- using dbAdmin) touch it. This is the post-Sentry replacement: errors land
-- here instead of vanishing into stdout, and the table can later be drained
-- to Logtail / Vercel log drains by a Trigger.dev cron without changing
-- callsites.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "error_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "level" text NOT NULL,
  "source" text NOT NULL,
  "message" text NOT NULL,
  "stack" text,
  "professional_id" uuid,
  "client_id" uuid,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX "error_logs_level_created_at_idx" ON "error_logs" ("level", "created_at");
--> statement-breakpoint

CREATE INDEX "error_logs_source_created_at_idx" ON "error_logs" ("source", "created_at");
--> statement-breakpoint

CREATE INDEX "error_logs_professional_created_at_idx" ON "error_logs" ("professional_id", "created_at");
--> statement-breakpoint

ALTER TABLE "error_logs" ENABLE ROW LEVEL SECURITY;
