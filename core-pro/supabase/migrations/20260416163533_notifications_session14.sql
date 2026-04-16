CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"user_type" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "client_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"notification_preferences" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_settings_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
ALTER TABLE "client_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "client_settings" ADD CONSTRAINT "client_settings_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_type","user_id");--> statement-breakpoint
CREATE POLICY "push_subscriptions_owner_select" ON "push_subscriptions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (
        ("push_subscriptions"."user_type" = 'professional' and "push_subscriptions"."user_id" in (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')))
        or
        ("push_subscriptions"."user_type" = 'client' and "push_subscriptions"."user_id" in (select id from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub')))
      );--> statement-breakpoint
CREATE POLICY "push_subscriptions_owner_insert" ON "push_subscriptions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
        ("push_subscriptions"."user_type" = 'professional' and "push_subscriptions"."user_id" in (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')))
        or
        ("push_subscriptions"."user_type" = 'client' and "push_subscriptions"."user_id" in (select id from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub')))
      );--> statement-breakpoint
CREATE POLICY "push_subscriptions_owner_delete" ON "push_subscriptions" AS PERMISSIVE FOR DELETE TO "authenticated" USING (
        ("push_subscriptions"."user_type" = 'professional' and "push_subscriptions"."user_id" in (select id from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')))
        or
        ("push_subscriptions"."user_type" = 'client' and "push_subscriptions"."user_id" in (select id from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub')))
      );--> statement-breakpoint
CREATE POLICY "client_settings_self_all" ON "client_settings" AS PERMISSIVE FOR ALL TO "authenticated" USING ("client_settings"."client_id" in (select id from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub'))) WITH CHECK ("client_settings"."client_id" in (select id from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub')));