CREATE TABLE "professionals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"clerk_org_id" text,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"phone" text,
	"bio" text,
	"avatar_url" text,
	"specialization" text[],
	"certifications" text[],
	"timezone" text DEFAULT 'Europe/Bucharest' NOT NULL,
	"locale" text DEFAULT 'ro' NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"plan" text DEFAULT 'starter' NOT NULL,
	"plan_limits" jsonb,
	"branding" jsonb,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "professionals_clerk_user_id_unique" UNIQUE("clerk_user_id"),
	CONSTRAINT "professionals_clerk_org_id_unique" UNIQUE("clerk_org_id")
);
--> statement-breakpoint
ALTER TABLE "professionals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "client_tags" (
	"client_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "client_tags_client_id_tag_id_pk" PRIMARY KEY("client_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "client_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"phone" text,
	"avatar_url" text,
	"date_of_birth" date,
	"locale" text DEFAULT 'ro' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clients_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "professional_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"role" text DEFAULT 'client' NOT NULL,
	"source" text,
	"start_date" date DEFAULT CURRENT_DATE NOT NULL,
	"end_date" date,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "professional_clients_unique" UNIQUE("professional_id","client_id")
);
--> statement-breakpoint
ALTER TABLE "professional_clients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_professional_name_unique" UNIQUE("professional_id","name")
);
--> statement-breakpoint
ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lead_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lead_activities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lead_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"color" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_won" boolean DEFAULT false NOT NULL,
	"is_lost" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lead_stages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"email" text,
	"phone" text,
	"source" text,
	"score" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"metadata" jsonb,
	"converted_client_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" numeric(10, 2),
	"currency" text DEFAULT 'EUR' NOT NULL,
	"duration_minutes" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"client_id" uuid,
	"service_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"location" text,
	"type" text DEFAULT 'in_person' NOT NULL,
	"notes" text,
	"metadata" jsonb,
	"external_calendar_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "availability_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "availability_slots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversations_unique" UNIQUE("professional_id","client_id")
);
--> statement-breakpoint
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"sender_role" text NOT NULL,
	"content" text,
	"type" text DEFAULT 'text' NOT NULL,
	"media_url" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "form_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"professional_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"due_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "form_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "form_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"assignment_id" uuid,
	"data" jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "form_responses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"schema" jsonb NOT NULL,
	"is_template" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "forms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"client_id" uuid,
	"uploaded_by" uuid NOT NULL,
	"name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_type" text,
	"file_size" integer,
	"category" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"user_type" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"read_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "automation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"automation_id" uuid NOT NULL,
	"target_id" uuid,
	"status" text,
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "automation_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "automations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"name" text NOT NULL,
	"trigger_type" text NOT NULL,
	"trigger_config" jsonb,
	"actions" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "automations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"service_id" uuid,
	"invoice_number" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"status" text DEFAULT 'unpaid' NOT NULL,
	"issued_at" date DEFAULT CURRENT_DATE NOT NULL,
	"due_at" date,
	"paid_at" date,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "marketing_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"content" jsonb,
	"file_url" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marketing_assets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "micro_sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"custom_domain" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"theme" text DEFAULT 'default' NOT NULL,
	"sections" jsonb,
	"seo_title" text,
	"seo_description" text,
	"social_links" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "micro_sites_professional_id_unique" UNIQUE("professional_id"),
	CONSTRAINT "micro_sites_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "micro_sites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "professional_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"notification_preferences" jsonb,
	"calendar_sync" jsonb,
	"integrations" jsonb,
	"gdpr_settings" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "professional_settings_professional_id_unique" UNIQUE("professional_id")
);
--> statement-breakpoint
ALTER TABLE "professional_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "client_tags" ADD CONSTRAINT "client_tags_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_tags" ADD CONSTRAINT "client_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_clients" ADD CONSTRAINT "professional_clients_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_clients" ADD CONSTRAINT "professional_clients_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_stages" ADD CONSTRAINT "lead_stages_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_stage_id_lead_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."lead_stages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_client_id_clients_id_fk" FOREIGN KEY ("converted_client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_assignments" ADD CONSTRAINT "form_assignments_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_assignments" ADD CONSTRAINT "form_assignments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_assignments" ADD CONSTRAINT "form_assignments_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_assignment_id_form_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."form_assignments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_assets" ADD CONSTRAINT "marketing_assets_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "micro_sites" ADD CONSTRAINT "micro_sites_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_settings" ADD CONSTRAINT "professional_settings_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "professionals_clerk_user_id_idx" ON "professionals" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "professionals_clerk_org_id_idx" ON "professionals" USING btree ("clerk_org_id");--> statement-breakpoint
CREATE INDEX "clients_clerk_user_id_idx" ON "clients" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "clients_email_idx" ON "clients" USING btree ("email");--> statement-breakpoint
CREATE INDEX "professional_clients_professional_id_idx" ON "professional_clients" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX "professional_clients_client_id_idx" ON "professional_clients" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "tags_professional_id_idx" ON "tags" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX "lead_activities_lead_id_idx" ON "lead_activities" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_stages_professional_id_idx" ON "lead_stages" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX "lead_stages_position_idx" ON "lead_stages" USING btree ("professional_id","position");--> statement-breakpoint
CREATE INDEX "leads_professional_id_idx" ON "leads" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX "leads_stage_id_idx" ON "leads" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "services_professional_id_idx" ON "services" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX "appointments_professional_id_idx" ON "appointments" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX "appointments_client_id_idx" ON "appointments" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "appointments_start_at_idx" ON "appointments" USING btree ("start_at");--> statement-breakpoint
CREATE INDEX "availability_slots_professional_id_idx" ON "availability_slots" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX "conversations_professional_id_idx" ON "conversations" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX "conversations_client_id_idx" ON "conversations" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_id_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "form_assignments_form_id_idx" ON "form_assignments" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "form_assignments_client_id_idx" ON "form_assignments" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "form_assignments_professional_id_idx" ON "form_assignments" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX "form_responses_form_id_idx" ON "form_responses" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "form_responses_client_id_idx" ON "form_responses" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "forms_professional_id_idx" ON "forms" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX "documents_professional_id_idx" ON "documents" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX "documents_client_id_idx" ON "documents" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_type","user_id");--> statement-breakpoint
CREATE INDEX "notifications_unread_idx" ON "notifications" USING btree ("user_type","user_id","read_at");--> statement-breakpoint
CREATE INDEX "automation_logs_automation_id_idx" ON "automation_logs" USING btree ("automation_id");--> statement-breakpoint
CREATE INDEX "automations_professional_id_idx" ON "automations" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX "invoices_professional_id_idx" ON "invoices" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX "invoices_client_id_idx" ON "invoices" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("professional_id","status");--> statement-breakpoint
CREATE INDEX "marketing_assets_professional_id_idx" ON "marketing_assets" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX "micro_sites_slug_idx" ON "micro_sites" USING btree ("slug");--> statement-breakpoint
CREATE POLICY "professionals_self_select" ON "professionals" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("professionals"."clerk_user_id" = (select auth.jwt() ->> 'sub'));--> statement-breakpoint
CREATE POLICY "professionals_self_update" ON "professionals" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("professionals"."clerk_user_id" = (select auth.jwt() ->> 'sub')) WITH CHECK ("professionals"."clerk_user_id" = (select auth.jwt() ->> 'sub'));--> statement-breakpoint
CREATE POLICY "client_tags_professional_all" ON "client_tags" AS PERMISSIVE FOR ALL TO "authenticated" USING ("client_tags"."tag_id" in (select id from public.tags where professional_id = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')))) WITH CHECK ("client_tags"."tag_id" in (select id from public.tags where professional_id = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))));--> statement-breakpoint
CREATE POLICY "clients_professional_select" ON "clients" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("clients"."id" in (
        select client_id from public.professional_clients
        where professional_id = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))
      ));--> statement-breakpoint
CREATE POLICY "clients_professional_insert" ON "clients" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "clients_professional_update" ON "clients" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("clients"."id" in (
        select client_id from public.professional_clients
        where professional_id = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))
      )) WITH CHECK ("clients"."id" in (
        select client_id from public.professional_clients
        where professional_id = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))
      ));--> statement-breakpoint
CREATE POLICY "clients_self_select" ON "clients" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("clients"."clerk_user_id" = (select auth.jwt() ->> 'sub'));--> statement-breakpoint
CREATE POLICY "clients_self_update" ON "clients" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("clients"."clerk_user_id" = (select auth.jwt() ->> 'sub')) WITH CHECK ("clients"."clerk_user_id" = (select auth.jwt() ->> 'sub'));--> statement-breakpoint
CREATE POLICY "professional_clients_professional_all" ON "professional_clients" AS PERMISSIVE FOR ALL TO "authenticated" USING ("professional_clients"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))) WITH CHECK ("professional_clients"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "professional_clients_client_select" ON "professional_clients" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("professional_clients"."client_id" in (select id from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "tags_professional_all" ON "tags" AS PERMISSIVE FOR ALL TO "authenticated" USING ("tags"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))) WITH CHECK ("tags"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "lead_activities_professional_all" ON "lead_activities" AS PERMISSIVE FOR ALL TO "authenticated" USING ("lead_activities"."lead_id" in (select id from public.leads where professional_id = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')))) WITH CHECK ("lead_activities"."lead_id" in (select id from public.leads where professional_id = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))));--> statement-breakpoint
CREATE POLICY "lead_stages_professional_all" ON "lead_stages" AS PERMISSIVE FOR ALL TO "authenticated" USING ("lead_stages"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))) WITH CHECK ("lead_stages"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "leads_professional_all" ON "leads" AS PERMISSIVE FOR ALL TO "authenticated" USING ("leads"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))) WITH CHECK ("leads"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "services_professional_all" ON "services" AS PERMISSIVE FOR ALL TO "authenticated" USING ("services"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))) WITH CHECK ("services"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "appointments_professional_all" ON "appointments" AS PERMISSIVE FOR ALL TO "authenticated" USING ("appointments"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))) WITH CHECK ("appointments"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "appointments_client_select" ON "appointments" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("appointments"."client_id" in (select id from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "availability_slots_professional_all" ON "availability_slots" AS PERMISSIVE FOR ALL TO "authenticated" USING ("availability_slots"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))) WITH CHECK ("availability_slots"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "conversations_participants_all" ON "conversations" AS PERMISSIVE FOR ALL TO "authenticated" USING (
        "conversations"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))
        or "conversations"."client_id" in (select id from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub'))
      ) WITH CHECK (
        "conversations"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))
        or "conversations"."client_id" in (select id from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub'))
      );--> statement-breakpoint
CREATE POLICY "messages_participants_all" ON "messages" AS PERMISSIVE FOR ALL TO "authenticated" USING (
        "messages"."conversation_id" in (
          select id from public.conversations
          where professional_id = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))
             or client_id in (select id from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub'))
        )
      ) WITH CHECK (
        "messages"."conversation_id" in (
          select id from public.conversations
          where professional_id = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))
             or client_id in (select id from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub'))
        )
      );--> statement-breakpoint
CREATE POLICY "form_assignments_professional_all" ON "form_assignments" AS PERMISSIVE FOR ALL TO "authenticated" USING ("form_assignments"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))) WITH CHECK ("form_assignments"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "form_assignments_client_select" ON "form_assignments" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("form_assignments"."client_id" in (select id from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "form_assignments_client_update" ON "form_assignments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("form_assignments"."client_id" in (select id from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub'))) WITH CHECK ("form_assignments"."client_id" in (select id from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "form_responses_professional_select" ON "form_responses" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("form_responses"."form_id" in (select id from public.forms where professional_id = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))));--> statement-breakpoint
CREATE POLICY "form_responses_client_insert" ON "form_responses" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("form_responses"."client_id" in (select id from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "form_responses_client_select" ON "form_responses" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("form_responses"."client_id" in (select id from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "forms_professional_all" ON "forms" AS PERMISSIVE FOR ALL TO "authenticated" USING ("forms"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))) WITH CHECK ("forms"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "forms_client_select_assigned" ON "forms" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("forms"."id" in (
        select form_id from public.form_assignments
        where client_id in (select id from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub'))
      ));--> statement-breakpoint
CREATE POLICY "documents_professional_all" ON "documents" AS PERMISSIVE FOR ALL TO "authenticated" USING ("documents"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))) WITH CHECK ("documents"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "documents_client_select" ON "documents" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("documents"."client_id" in (select id from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "documents_client_insert" ON "documents" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("documents"."client_id" in (select id from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "notifications_recipient_select" ON "notifications" AS PERMISSIVE FOR SELECT TO "authenticated" USING (
        ("notifications"."user_type" = 'professional' and "notifications"."user_id" in (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')))
        or
        ("notifications"."user_type" = 'client' and "notifications"."user_id" in (select id from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub')))
      );--> statement-breakpoint
CREATE POLICY "notifications_recipient_update" ON "notifications" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (
        ("notifications"."user_type" = 'professional' and "notifications"."user_id" in (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')))
        or
        ("notifications"."user_type" = 'client' and "notifications"."user_id" in (select id from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub')))
      ) WITH CHECK (
        ("notifications"."user_type" = 'professional' and "notifications"."user_id" in (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')))
        or
        ("notifications"."user_type" = 'client' and "notifications"."user_id" in (select id from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub')))
      );--> statement-breakpoint
CREATE POLICY "automation_logs_professional_select" ON "automation_logs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("automation_logs"."automation_id" in (select id from public.automations where professional_id = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))));--> statement-breakpoint
CREATE POLICY "automations_professional_all" ON "automations" AS PERMISSIVE FOR ALL TO "authenticated" USING ("automations"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))) WITH CHECK ("automations"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "invoices_professional_all" ON "invoices" AS PERMISSIVE FOR ALL TO "authenticated" USING ("invoices"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))) WITH CHECK ("invoices"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "invoices_client_select" ON "invoices" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("invoices"."client_id" in (select id from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "marketing_assets_professional_all" ON "marketing_assets" AS PERMISSIVE FOR ALL TO "authenticated" USING ("marketing_assets"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))) WITH CHECK ("marketing_assets"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "micro_sites_owner_all" ON "micro_sites" AS PERMISSIVE FOR ALL TO "authenticated" USING ("micro_sites"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))) WITH CHECK ("micro_sites"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "micro_sites_public_select" ON "micro_sites" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("micro_sites"."is_published" = true);--> statement-breakpoint
CREATE POLICY "professional_settings_owner_all" ON "professional_settings" AS PERMISSIVE FOR ALL TO "authenticated" USING ("professional_settings"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub'))) WITH CHECK ("professional_settings"."professional_id" = (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')));