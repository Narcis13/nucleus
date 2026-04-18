-- ─────────────────────────────────────────────────────────────────────────────
-- Fix RLS infinite recursion between `clients` and `professional_clients`.
--
-- The original policies formed a cycle:
--   clients_professional_select  → reads professional_clients
--   professional_clients_client_select → reads clients
-- Postgres's rewriter inlines both subqueries and detects the cycle, raising
-- "infinite recursion detected in policy for relation \"clients\"".
--
-- We break the cycle with SECURITY DEFINER helpers. The functions execute as
-- their owner (postgres, BYPASSRLS), so their internal reads of
-- professionals / professional_clients / clients are not re-gated by RLS.
-- auth.jwt() still resolves to the caller's session GUCs, so identity is
-- preserved.
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper: the current authenticated professional's row id (if any).
CREATE OR REPLACE FUNCTION public.app_current_professional_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.professionals
  WHERE clerk_user_id = (auth.jwt() ->> 'sub')
  LIMIT 1;
$$;
--> statement-breakpoint

-- Helper: the current authenticated client's row id (if any).
CREATE OR REPLACE FUNCTION public.app_current_client_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.clients
  WHERE clerk_user_id = (auth.jwt() ->> 'sub')
  LIMIT 1;
$$;
--> statement-breakpoint

-- Helper: does `cid` belong to the current professional?
CREATE OR REPLACE FUNCTION public.app_is_client_of_current_professional(cid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.professional_clients pc
    WHERE pc.client_id = cid
      AND pc.professional_id = public.app_current_professional_id()
  );
$$;
--> statement-breakpoint

-- Drop the recursive policies and recreate them via the helpers.
DROP POLICY IF EXISTS "clients_professional_select" ON "clients";
--> statement-breakpoint
DROP POLICY IF EXISTS "clients_professional_update" ON "clients";
--> statement-breakpoint
DROP POLICY IF EXISTS "professional_clients_client_select" ON "professional_clients";
--> statement-breakpoint

CREATE POLICY "clients_professional_select" ON "clients"
  AS PERMISSIVE FOR SELECT
  TO "authenticated"
  USING (public.app_is_client_of_current_professional(id));
--> statement-breakpoint

CREATE POLICY "clients_professional_update" ON "clients"
  AS PERMISSIVE FOR UPDATE
  TO "authenticated"
  USING (public.app_is_client_of_current_professional(id))
  WITH CHECK (public.app_is_client_of_current_professional(id));
--> statement-breakpoint

CREATE POLICY "professional_clients_client_select" ON "professional_clients"
  AS PERMISSIVE FOR SELECT
  TO "authenticated"
  USING (client_id = public.app_current_client_id());
