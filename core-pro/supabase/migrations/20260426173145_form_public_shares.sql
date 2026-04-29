-- ─────────────────────────────────────────────────────────────────────────────
-- Public form shares — single-use (or capped) tokenized links so non-clients
-- (e.g. property viewers in real-estate) can fill out a form without a portal
-- session. Submissions land in form_responses with `client_id` NULL and an
-- optional `subject_client_id` so a *different* client (e.g. the apartment
-- owner) can read responses about them.
--
-- RLS:
--   form_public_shares — pro-only (no client/anonymous policy). Public submit
--                        is performed via the service-role connection.
--   form_responses     — existing pro/client policies preserved; one new
--                        policy lets the subject client SELECT responses
--                        attributed to them.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "form_public_shares" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "form_id" uuid NOT NULL,
  "professional_id" uuid NOT NULL,
  "subject_client_id" uuid,
  "subject_appointment_id" uuid,
  "token_hash" bytea NOT NULL,
  "max_responses" integer NOT NULL DEFAULT 1,
  "response_count" integer NOT NULL DEFAULT 0,
  "expires_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "form_public_shares_form_id_fk"
    FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE CASCADE,
  CONSTRAINT "form_public_shares_professional_id_fk"
    FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE CASCADE,
  CONSTRAINT "form_public_shares_subject_client_id_fk"
    FOREIGN KEY ("subject_client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL,
  CONSTRAINT "form_public_shares_subject_appointment_id_fk"
    FOREIGN KEY ("subject_appointment_id") REFERENCES "public"."appointments"("id") ON DELETE SET NULL
);
--> statement-breakpoint

CREATE UNIQUE INDEX "form_public_shares_token_hash_idx" ON "form_public_shares" ("token_hash");
--> statement-breakpoint
CREATE INDEX "form_public_shares_form_id_idx" ON "form_public_shares" ("form_id");
--> statement-breakpoint
CREATE INDEX "form_public_shares_subject_client_id_idx" ON "form_public_shares" ("subject_client_id");
--> statement-breakpoint

ALTER TABLE "form_public_shares" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "form_public_shares_professional_all" ON "form_public_shares"
  AS PERMISSIVE FOR ALL
  TO "authenticated"
  USING (
    professional_id = (
      SELECT id FROM public.professionals
      WHERE clerk_user_id = (SELECT auth.jwt() ->> 'sub')
    )
  )
  WITH CHECK (
    professional_id = (
      SELECT id FROM public.professionals
      WHERE clerk_user_id = (SELECT auth.jwt() ->> 'sub')
    )
  );
--> statement-breakpoint

-- ── form_responses: relax client_id, add share + subject pointers ────────────
ALTER TABLE "form_responses" ALTER COLUMN "client_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "form_responses" ADD COLUMN "share_id" uuid;
--> statement-breakpoint
ALTER TABLE "form_responses" ADD COLUMN "subject_client_id" uuid;
--> statement-breakpoint
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_share_id_fk"
  FOREIGN KEY ("share_id") REFERENCES "public"."form_public_shares"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_subject_client_id_fk"
  FOREIGN KEY ("subject_client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX "form_responses_subject_client_id_idx" ON "form_responses" ("subject_client_id");
--> statement-breakpoint
CREATE INDEX "form_responses_share_id_idx" ON "form_responses" ("share_id");
--> statement-breakpoint

CREATE POLICY "form_responses_subject_client_select" ON "form_responses"
  AS PERMISSIVE FOR SELECT
  TO "authenticated"
  USING (
    subject_client_id IN (
      SELECT id FROM public.clients
      WHERE clerk_user_id = (SELECT auth.jwt() ->> 'sub')
    )
  );
