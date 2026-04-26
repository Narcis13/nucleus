-- ─────────────────────────────────────────────────────────────────────────────
-- Portal auth — Phase 1 of the Portal-Auth-Refactor (docs/Portal-Auth-Refactor-Plan-v1.0.md).
--
-- Decouples the client portal from Clerk: an agent mints a magic-link ticket
-- (`portal_invites`), the client trades it for a cookie session
-- (`portal_sessions`). Clerk continues to handle agent (professional) auth.
--
-- RLS is enabled on both tables but no permissive policy is granted — only
-- the server (service role + the Drizzle direct connection used by the
-- portal services) ever reads or writes these rows. Postgres denies-by-default
-- for the `authenticated` role we hand out via `withRLS`.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "portal_invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL,
  "professional_id" uuid NOT NULL,
  "token_hash" bytea NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "portal_invites_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE,
  CONSTRAINT "portal_invites_professional_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id")
);
--> statement-breakpoint

CREATE UNIQUE INDEX "portal_invites_token_hash_idx" ON "portal_invites" ("token_hash");
--> statement-breakpoint

ALTER TABLE "portal_invites" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE "portal_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  "user_agent" text,
  "ip" inet,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_seen_at" timestamp with time zone,
  CONSTRAINT "portal_sessions_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE
);
--> statement-breakpoint

CREATE INDEX "portal_sessions_client_id_expires_at_idx" ON "portal_sessions" ("client_id", "expires_at");
--> statement-breakpoint

ALTER TABLE "portal_sessions" ENABLE ROW LEVEL SECURITY;
