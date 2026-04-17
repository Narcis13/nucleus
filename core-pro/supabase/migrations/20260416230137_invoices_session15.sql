-- ─────────────────────────────────────────────────────────────────────────────
-- Session 15 · Invoice tracking
--
-- Extends `invoices` with full billing detail (line items, totals, tax,
-- payment tracking) and introduces two sidecar tables:
--   · `invoice_settings`    — one row per professional (numbering, defaults)
--   · `payment_reminders`   — audit trail for dunning emails
--
-- No payment processing — this is tracking only. Stripe remains the processor
-- for subscription billing, which lives on `professionals.stripe_*`.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── invoices: column renames + additions ────────────────────────────────────
ALTER TABLE "invoices" RENAME COLUMN "amount" TO "total";--> statement-breakpoint
ALTER TABLE "invoices" RENAME COLUMN "issued_at" TO "issue_date";--> statement-breakpoint
ALTER TABLE "invoices" RENAME COLUMN "due_at" TO "due_date";--> statement-breakpoint
ALTER TABLE "invoices" RENAME COLUMN "paid_at" TO "paid_date";--> statement-breakpoint

ALTER TABLE "invoices" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "total" SET DEFAULT '0';--> statement-breakpoint
UPDATE "invoices" SET "due_date" = "issue_date" WHERE "due_date" IS NULL;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "due_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "due_date" SET DEFAULT CURRENT_DATE;--> statement-breakpoint

ALTER TABLE "invoices" ADD COLUMN "appointment_id" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "line_items" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "subtotal" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "tax_amount" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "discount" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "paid_amount" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "payment_method" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "payment_reference" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "viewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "terms" text DEFAULT 'Net 30' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "invoices_due_date_idx" ON "invoices" USING btree ("due_date");--> statement-breakpoint

-- `updated_at` trigger: 9903_triggers.sql attaches triggers to every table
-- with an updated_at column, but only runs during a full `db reset`. For
-- incremental `db push`, we must re-attach explicitly here so live DBs pick
-- up triggers on new/altered tables.
DROP TRIGGER IF EXISTS set_updated_at ON public.invoices;--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();--> statement-breakpoint

-- ── invoice_settings ────────────────────────────────────────────────────────
CREATE TABLE "invoice_settings" (
  "professional_id" uuid PRIMARY KEY NOT NULL,
  "next_invoice_number" integer DEFAULT 1 NOT NULL,
  "invoice_prefix" text DEFAULT 'INV' NOT NULL,
  "default_due_days" integer DEFAULT 30 NOT NULL,
  "default_terms" text DEFAULT 'Net 30' NOT NULL,
  "default_notes" text,
  "tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
  "logo_url" text,
  "company_info" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoice_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "invoice_settings" ADD CONSTRAINT "invoice_settings_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "invoice_settings_professional_all" ON "invoice_settings" AS PERMISSIVE FOR ALL TO "authenticated" USING ("invoice_settings"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))) WITH CHECK ("invoice_settings"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint

-- ── payment_reminders ───────────────────────────────────────────────────────
CREATE TABLE "payment_reminders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id" uuid NOT NULL,
  "professional_id" uuid NOT NULL,
  "reminder_type" text NOT NULL,
  "days_overdue" integer NOT NULL,
  "sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_reminders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_reminders_invoice_idx" ON "payment_reminders" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "payment_reminders_professional_idx" ON "payment_reminders" USING btree ("professional_id");--> statement-breakpoint
CREATE POLICY "payment_reminders_professional_all" ON "payment_reminders" AS PERMISSIVE FOR ALL TO "authenticated" USING ("payment_reminders"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))) WITH CHECK ("payment_reminders"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')));
--> statement-breakpoint

DROP TRIGGER IF EXISTS set_updated_at ON public.invoice_settings;--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.invoice_settings
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();
