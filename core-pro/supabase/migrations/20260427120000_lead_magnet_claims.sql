-- ─────────────────────────────────────────────────────────────────────────────
-- Lead-magnet double opt-in.
--
-- A claim row is minted on form submit; an email containing /m/claim/<token>
-- is sent to the visitor; the claim route atomically marks `claimed_at` and
-- creates the lead + activity + download record. Until the claim is consumed,
-- no lead exists in the pro's pipeline — fake emails never reach the PDF.
--
-- Token storage mirrors `portal_invites`: only sha256(token) is persisted, so
-- a DB leak can't be replayed. RLS is enabled with no permissive policy —
-- only the server (dbAdmin) reads/writes these rows.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "lead_magnet_claims" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lead_magnet_id" uuid NOT NULL,
  "professional_id" uuid NOT NULL,
  "email" text NOT NULL,
  "full_name" text NOT NULL,
  "phone" text,
  "slug" text NOT NULL,
  "token_hash" bytea NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "claimed_at" timestamp with time zone,
  "lead_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "lead_magnet_claims_lead_magnet_id_fk" FOREIGN KEY ("lead_magnet_id") REFERENCES "public"."lead_magnets"("id") ON DELETE CASCADE,
  CONSTRAINT "lead_magnet_claims_professional_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE CASCADE
);
--> statement-breakpoint

CREATE UNIQUE INDEX "lead_magnet_claims_token_hash_idx" ON "lead_magnet_claims" ("token_hash");
--> statement-breakpoint

CREATE INDEX "lead_magnet_claims_magnet_idx" ON "lead_magnet_claims" ("lead_magnet_id");
--> statement-breakpoint

ALTER TABLE "lead_magnet_claims" ENABLE ROW LEVEL SECURITY;
