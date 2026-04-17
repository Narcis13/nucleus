-- ─────────────────────────────────────────────────────────────────────────────
-- Session 25 pre-flight RLS fixes
--
-- 1. `services` — add anon SELECT for active rows so micro-sites can list
--    services to unauthenticated visitors.
-- 2. `lead_magnet_downloads` — add anon INSERT for published magnets so the
--    public download form can log a download before any user session exists.
--
-- Both policies are additive (`AS PERMISSIVE`). Existing owner-scoped policies
-- on these tables remain in place.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "services_public_select" ON "services";
--> statement-breakpoint

CREATE POLICY "services_public_select" ON "services"
  AS PERMISSIVE FOR SELECT
  TO "anon", "authenticated"
  USING ("services"."is_active" = true);
--> statement-breakpoint

DROP POLICY IF EXISTS "lead_magnet_downloads_public_insert" ON "lead_magnet_downloads";
--> statement-breakpoint

CREATE POLICY "lead_magnet_downloads_public_insert" ON "lead_magnet_downloads"
  AS PERMISSIVE FOR INSERT
  TO "anon", "authenticated"
  WITH CHECK (
    "lead_magnet_downloads"."lead_magnet_id" IN (
      select id from public.lead_magnets where is_published = true
    )
  );
