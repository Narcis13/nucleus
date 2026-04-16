-- Dev seed data. Applied automatically by `supabase db reset`.
--
-- Convention: fixed UUIDs + Clerk ids so tests and stories can reference them.
-- `clerk_user_id` values are placeholders — swap in a real Clerk sandbox user
-- when exercising the authenticated flow locally.

-- ── Professional ───────────────────────────────────────────────────────────
insert into public.professionals (
  id, clerk_user_id, clerk_org_id, email, full_name, phone, bio, timezone,
  locale, currency, plan, plan_limits, branding, onboarding_completed
) values (
  '11111111-1111-1111-1111-111111111111',
  'user_seed_professional',
  'org_seed_professional',
  'maria@corepro.dev',
  'Maria Ionescu',
  '+40700000000',
  'Personal trainer cu 10 ani experiență.',
  'Europe/Bucharest',
  'ro',
  'EUR',
  'growth',
  '{"max_clients": 50, "max_storage_mb": 2000, "features": ["automations","micro_site"]}'::jsonb,
  '{"primary_color": "#6366f1", "secondary_color": "#f59e0b", "font": "Inter"}'::jsonb,
  true
)
on conflict (id) do nothing;

-- ── Clients (3) ────────────────────────────────────────────────────────────
insert into public.clients (id, clerk_user_id, email, full_name, phone, locale) values
  ('22222222-2222-2222-2222-222222222221', 'user_seed_client_1', 'andrei@example.com', 'Andrei Popescu', '+40711111111', 'ro'),
  ('22222222-2222-2222-2222-222222222222', 'user_seed_client_2', 'elena@example.com', 'Elena Marin',    '+40722222222', 'ro'),
  ('22222222-2222-2222-2222-222222222223', null,                  'ioana@example.com', 'Ioana Dobre',    '+40733333333', 'ro')
on conflict (id) do nothing;

-- ── professional_clients (link) ────────────────────────────────────────────
insert into public.professional_clients (professional_id, client_id, status, role, source) values
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', 'active', 'client', 'manual'),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'active', 'client', 'micro-site'),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222223', 'paused', 'client', 'referral')
on conflict (professional_id, client_id) do nothing;

-- ── Tags ───────────────────────────────────────────────────────────────────
insert into public.tags (id, professional_id, name, color) values
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111111', 'VIP',          '#ef4444'),
  ('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111111', 'Incepator',    '#10b981'),
  ('33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111111', 'Recuperare',   '#3b82f6')
on conflict (professional_id, name) do nothing;

-- ── Lead stages (default pipeline) ─────────────────────────────────────────
insert into public.lead_stages (id, professional_id, name, position, color, is_default, is_won, is_lost) values
  ('44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111111', 'New',         1, '#94a3b8', true,  false, false),
  ('44444444-4444-4444-4444-444444444402', '11111111-1111-1111-1111-111111111111', 'Contacted',   2, '#60a5fa', false, false, false),
  ('44444444-4444-4444-4444-444444444403', '11111111-1111-1111-1111-111111111111', 'Qualified',   3, '#a78bfa', false, false, false),
  ('44444444-4444-4444-4444-444444444404', '11111111-1111-1111-1111-111111111111', 'Won',         4, '#10b981', false, true,  false),
  ('44444444-4444-4444-4444-444444444405', '11111111-1111-1111-1111-111111111111', 'Lost',        5, '#ef4444', false, false, true)
on conflict (id) do nothing;

-- ── Services ───────────────────────────────────────────────────────────────
insert into public.services (id, professional_id, name, description, price, currency, duration_minutes, is_active) values
  ('55555555-5555-5555-5555-555555555501', '11111111-1111-1111-1111-111111111111', 'Sesiune Individuală',    'Antrenament 1-la-1 de 60 min.',          45.00, 'EUR', 60, true),
  ('55555555-5555-5555-5555-555555555502', '11111111-1111-1111-1111-111111111111', 'Pachet 10 Sesiuni',      '10 sesiuni individuale, valabil 3 luni.', 400.00, 'EUR', 60, true),
  ('55555555-5555-5555-5555-555555555503', '11111111-1111-1111-1111-111111111111', 'Consultație Online',     'Evaluare online + plan de antrenament.',  30.00, 'EUR', 45, true)
on conflict (id) do nothing;
