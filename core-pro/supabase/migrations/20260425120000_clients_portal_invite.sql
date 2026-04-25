-- ─────────────────────────────────────────────────────────────────────────────
-- Magic-link client portal access — Phase 0.5.
--
-- Adds columns to `clients` so we can track the Clerk OrganizationInvitation
-- (id + magic-link URL the agent forwards to the client), when it was sent,
-- and whether the agent has revoked access. Status is *derived* in code:
--
--   clerk_user_id IS NOT NULL AND portal_invite_revoked_at IS NULL  → active
--   portal_invite_id IS NOT NULL AND clerk_user_id IS NULL          → invited
--   portal_invite_revoked_at IS NOT NULL AND portal_invite_id NULL  → revoked
--   else                                                             → not_invited
--
-- No RLS changes required — these columns ride the existing
-- `clients_professional_*` policies.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS portal_invite_id text,
  ADD COLUMN IF NOT EXISTS portal_invite_url text,
  ADD COLUMN IF NOT EXISTS portal_invite_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS portal_invite_revoked_at timestamptz;
