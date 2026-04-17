-- ─────────────────────────────────────────────────────────────────────────────
-- Session 17 · Marketing Kit
--
-- Adds four tables for the email-campaigns + social-templates + lead-magnets
-- workflow:
--   · email_campaigns                   — per-professional campaigns with
--                                         audience descriptor + counters
--   · email_campaign_recipients         — per-recipient delivery/open state
--   · social_templates                  — design JSON + caption, exported to
--                                         PNG client-side
--   · lead_magnets / lead_magnet_downloads
--                                         — gated downloads surfaced on the
--                                         anonymous micro-site
--
-- RLS policies mirror the pattern used by the rest of the app (owner-scoped
-- through `currentProfessionalIdSql`). Lead magnets are additionally readable
-- by anon/authenticated when `is_published = true` so the micro-site can list
-- them without a service-role query.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── email_campaigns ─────────────────────────────────────────────────────────
CREATE TABLE "email_campaigns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "professional_id" uuid NOT NULL,
  "name" text NOT NULL,
  "template_key" text NOT NULL,
  "subject" text NOT NULL,
  "body_html" text NOT NULL,
  "audience" jsonb NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "scheduled_at" timestamp with time zone,
  "sent_at" timestamp with time zone,
  "sent_count" integer DEFAULT 0 NOT NULL,
  "opened_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "email_campaigns"
  ADD CONSTRAINT "email_campaigns_professional_id_professionals_id_fk"
  FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "email_campaigns_professional_id_idx"
  ON "email_campaigns" USING btree ("professional_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_campaigns_status_idx"
  ON "email_campaigns" USING btree ("professional_id", "status");
--> statement-breakpoint

ALTER TABLE "email_campaigns" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "email_campaigns_professional_all" ON "email_campaigns"
  AS PERMISSIVE FOR ALL
  TO "authenticated"
  USING (
    "email_campaigns"."professional_id" = (
      select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')
    )
  )
  WITH CHECK (
    "email_campaigns"."professional_id" = (
      select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')
    )
  );
--> statement-breakpoint

-- ── email_campaign_recipients ───────────────────────────────────────────────
CREATE TABLE "email_campaign_recipients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "campaign_id" uuid NOT NULL,
  "email" text NOT NULL,
  "full_name" text,
  "client_id" uuid,
  "status" text DEFAULT 'queued' NOT NULL,
  "resend_message_id" text,
  "error" text,
  "sent_at" timestamp with time zone,
  "opened_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "email_campaign_recipients"
  ADD CONSTRAINT "email_campaign_recipients_campaign_id_email_campaigns_id_fk"
  FOREIGN KEY ("campaign_id") REFERENCES "public"."email_campaigns"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "email_campaign_recipients_campaign_id_idx"
  ON "email_campaign_recipients" USING btree ("campaign_id");
--> statement-breakpoint

ALTER TABLE "email_campaign_recipients" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "email_campaign_recipients_professional_all" ON "email_campaign_recipients"
  AS PERMISSIVE FOR ALL
  TO "authenticated"
  USING (
    "email_campaign_recipients"."campaign_id" IN (
      select id from public.email_campaigns where professional_id = (
        select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')
      )
    )
  )
  WITH CHECK (
    "email_campaign_recipients"."campaign_id" IN (
      select id from public.email_campaigns where professional_id = (
        select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')
      )
    )
  );
--> statement-breakpoint

-- ── social_templates ────────────────────────────────────────────────────────
CREATE TABLE "social_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "professional_id" uuid NOT NULL,
  "name" text NOT NULL,
  "layout" text NOT NULL,
  "platform" text NOT NULL,
  "design" jsonb NOT NULL,
  "caption" text,
  "hashtags" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "social_templates"
  ADD CONSTRAINT "social_templates_professional_id_professionals_id_fk"
  FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "social_templates_professional_id_idx"
  ON "social_templates" USING btree ("professional_id");
--> statement-breakpoint

ALTER TABLE "social_templates" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "social_templates_professional_all" ON "social_templates"
  AS PERMISSIVE FOR ALL
  TO "authenticated"
  USING (
    "social_templates"."professional_id" = (
      select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')
    )
  )
  WITH CHECK (
    "social_templates"."professional_id" = (
      select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')
    )
  );
--> statement-breakpoint

-- ── lead_magnets ────────────────────────────────────────────────────────────
CREATE TABLE "lead_magnets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "professional_id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "file_key" text NOT NULL,
  "file_name" text NOT NULL,
  "file_size" integer DEFAULT 0 NOT NULL,
  "is_published" boolean DEFAULT true NOT NULL,
  "download_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "lead_magnets"
  ADD CONSTRAINT "lead_magnets_professional_id_professionals_id_fk"
  FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "lead_magnets_professional_id_idx"
  ON "lead_magnets" USING btree ("professional_id");
--> statement-breakpoint

ALTER TABLE "lead_magnets" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "lead_magnets_professional_all" ON "lead_magnets"
  AS PERMISSIVE FOR ALL
  TO "authenticated"
  USING (
    "lead_magnets"."professional_id" = (
      select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')
    )
  )
  WITH CHECK (
    "lead_magnets"."professional_id" = (
      select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')
    )
  );
--> statement-breakpoint

CREATE POLICY "lead_magnets_public_select" ON "lead_magnets"
  AS PERMISSIVE FOR SELECT
  TO "anon", "authenticated"
  USING ("lead_magnets"."is_published" = true);
--> statement-breakpoint

-- ── lead_magnet_downloads ───────────────────────────────────────────────────
CREATE TABLE "lead_magnet_downloads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lead_magnet_id" uuid NOT NULL,
  "email" text NOT NULL,
  "full_name" text,
  "phone" text,
  "lead_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "lead_magnet_downloads"
  ADD CONSTRAINT "lead_magnet_downloads_lead_magnet_id_lead_magnets_id_fk"
  FOREIGN KEY ("lead_magnet_id") REFERENCES "public"."lead_magnets"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "lead_magnet_downloads_magnet_idx"
  ON "lead_magnet_downloads" USING btree ("lead_magnet_id");
--> statement-breakpoint

ALTER TABLE "lead_magnet_downloads" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "lead_magnet_downloads_professional_all" ON "lead_magnet_downloads"
  AS PERMISSIVE FOR ALL
  TO "authenticated"
  USING (
    "lead_magnet_downloads"."lead_magnet_id" IN (
      select id from public.lead_magnets where professional_id = (
        select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')
      )
    )
  )
  WITH CHECK (
    "lead_magnet_downloads"."lead_magnet_id" IN (
      select id from public.lead_magnets where professional_id = (
        select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')
      )
    )
  );

-- ── updated_at triggers ─────────────────────────────────────────────────────
-- 9903_triggers.sql only runs on `db reset`. For incremental `db push`, attach
-- triggers explicitly so live DBs pick them up for the new tables below.
DROP TRIGGER IF EXISTS set_updated_at ON public.email_campaigns;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at ON public.social_templates;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.social_templates
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at ON public.lead_magnets;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.lead_magnets
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();
