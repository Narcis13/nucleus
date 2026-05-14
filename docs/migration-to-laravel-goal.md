`/goal Stand up core-laravel/ as a Laravel 12 + Livewire 3 + Filament 4 port of core-pro/, with Phase 1 shipped end-to-end: multi-tenant auth (Google OAuth + email/password), real-estate-CRM core (organizations → professionals → clients/leads), Filament admin + Livewire dashboard, all green tests, runnable locally via docker compose.`

---

## CONTEXT

- **Project**: Nucleus — a vertical-SaaS CRM boilerplate for Romanian/EU real-estate agents. Clients/leads model real-world *viewers*; appointments model *showings*. The template is meant to be re-instantiated per vertical (next likely: fitness, legal).
- **Stack (source → target)**:
  - **Source** (`core-pro/`): Next.js 15.5 LTS, React 19, Clerk Organizations, Supabase RLS via Clerk Third-Party Auth, Drizzle ORM, `next-safe-action`, Trigger.dev v4, Stripe v22, Supabase Realtime, `@react-pdf/renderer`, `@dnd-kit`, Base UI, custom portal magic-link auth.
  - **Target** (`core-laravel/`): Laravel 12 + Livewire 3 + Filament 4 + Postgres 16, per the "Boring-Stack Template" doc at the repo root. Pinned versions in §0 of `nucleus-Boilerplate-Audit-and-Vertical-Strategy.md` are authoritative — do not bump majors.
- **Current state**:
  - `core-pro/` is the active path, decided 2026-04-25. It must remain runnable and untouched.
  - 16 Drizzle schema files exist at `core-pro/lib/db/schema/`: `audit`, `automations`, `clients`, `documents`, `forms`, `invoices`, `leads`, `marketing`, `messaging`, `micro_sites`, `notifications`, `portal_auth`, `professionals`, `scheduling`, `services`, `settings`.
  - Supabase migrations live at `core-pro/supabase/migrations/` and encode RLS policies.
  - Trigger.dev jobs live at `core-pro/trigger/jobs/`.
  - Portal auth was just decoupled from Clerk (custom magic-link + cookie session) per `docs/Portal-Auth-Refactor-Plan-v1.0.md`.
  - Feature gating is **off** at boilerplate stage (`FEATURE_GATING_ENABLED = false` in `core-pro/lib/stripe/plans.ts`).
- **Working dir**: `/Users/narcisbrindusescu/newme/nucleus`. Create the port at `core-laravel/` (parallel to `core-pro/`, matches the prior `nucleus-rails-spike/` convention).
- **Constraints**:
  - **Do not modify `core-pro/`.** Read-only reference.
  - **No bleeding-edge.** PHP 8.3, Laravel `^12.0`, Livewire `^3.7`, Filament `^4.11`, Pest `^3`. No Filament v5, no Livewire v4, no Laravel 13.
  - **No Sentry** (explicitly removed from `core-pro/`, do not reintroduce).
  - **Pin every dependency to an exact minor.** AI tools regress on unpinned majors.
  - Solo dev (Narcis), Romanian timezone (`Europe/Bucharest`), Romanian locale (`ro`).
  - Use Postgres 16 only. `jsonb` (never `json`). String columns + PHP enum casts (never native PG enums).
- **Audience**: Solo founder rebuilding the CRM boilerplate on a stack with higher per-feature productivity (Filament admin, Spatie ecosystem, mature `pristavu/laravel-anaf` for e-Factura). Future projects will be cloned from this template per vertical.

---

## SUCCESS CRITERIA (ALL MUST BE TRUE)

1. `core-laravel/` exists, installs cleanly: `cd core-laravel && composer install && cp .env.example .env && php artisan key:generate && php artisan migrate --seed` succeeds against the dockerized Postgres 16.
2. **Multi-tenancy works.** A logged-in user belongs to exactly one active `organization` at a time. All tenant-scoped models (`Professional`, `Client`, `Lead`) auto-filter by `current_organization_id` via a global scope; switching org via `/organizations/{id}/switch` re-scopes every query without leaks. A Pest test proves user A in org A cannot read org B's clients (returns 404, not 403, to avoid existence-leak).
3. **Google OAuth + email/password linking works**, mirroring §1d of the audit doc: `social_accounts` pivot, `users.password` nullable, verified-email guard, attach-to-current-user when already authenticated. A Pest test covers all three branches (existing social account, verified-email link, brand-new user creation).
4. **Real-estate CRM core entities exist** as Laravel migrations + Eloquent models + factories: `organizations`, `users`, `organization_user` (pivot with `role` enum: `owner|admin|agent`), `social_accounts`, `professionals` (per-user agent profile inside an org), `clients` (the "viewers"), `leads` (pre-conversion contacts with a `converted_client_id` self-link). Pest factories produce a fully-seeded org in one line: `Organization::factory()->withOwner()->withClients(5)->withLeads(10)->create()`.
5. **Filament admin panel at `/admin`** exposes resources for `Organization`, `User`, `Professional`, `Client`, `Lead`. Restricted to users with `role=owner` or `role=admin` on their current org. Login via the same Fortify session.
6. **Livewire dashboard at `/dashboard`** (using Flux UI from the Livewire starter kit) lists the current agent's clients and leads, with a Volt-based `clients/index.blade.php` (filter tabs by lifecycle stage, paginated, optimistic delete with policy check).
7. **Authorization is policy-based**, not RLS. Every tenant-scoped model has a `*Policy` class. Document the security-model shift in `core-laravel/docs/01-authorization-vs-rls.md` so future maintainers don't try to add Postgres RLS.
8. **All quality gates green** in CI-equivalent local runs:
   - `./vendor/bin/pint --test` (no formatting drift)
   - `./vendor/bin/phpstan analyse` at level 6 minimum (Larastan)
   - `./vendor/bin/pest --parallel` — minimum 18 tests across feature + unit, all passing
9. **Docker compose + Justfile** work: `just db-up && just laravel-install && just laravel-up` starts Postgres, Mailpit, and `php artisan serve` at `http://localhost:8000`. `just laravel-test` runs Pest.
10. **Proof captured**: screenshots of (a) `/admin` listing 5 seeded clients in org A, (b) `/dashboard` showing the same 5 to the agent user, (c) Pest output with all-green count, (d) `psql` output showing org B's clients invisible to org A's session.
11. **Migration map document** at `core-laravel/docs/00-migration-map.md` enumerates every `core-pro/lib/db/schema/*.ts` and marks it as **DONE in Phase 1**, **PLANNED in Phase N**, or **DEFERRED** with the reason. Subsequent /goal runs read this file to continue.

---

## OPERATING RULES — NON-NEGOTIABLE

1. **PLAN FIRST.** Output a numbered task list before writing any code. Update it as work progresses. Use the harness task tracker.
2. **WORK AUTONOMOUSLY.** Don't ask clarifying questions unless genuinely blocked. State assumptions in one line and proceed (per `CLAUDE.md` §1 "Bias toward action ~85%").
3. **SELF-VERIFY.** After each migration: run `php artisan migrate:fresh --seed`, then the relevant Pest test. After each Livewire/Filament component: render it in `php artisan serve` and curl-check the route.
4. **DEBUG YOURSELF.** Failed test = re-read the diff, the test, the model. Don't hand it back. Don't disable tests.
5. **USE EVERY TOOL.** Read `core-pro/lib/db/schema/*.ts` to understand column semantics before writing the equivalent Laravel migration. Use the Bash tool for `psql`, `composer`, `php artisan`. Use the Read tool — never `cat`.
6. **NO PLACEHOLDERS.** No `// TODO`, no stub controllers, no empty Filament forms. If a column exists in source, it exists in target. If you can't fully port a column this phase, omit it from the migration entirely and log it in `00-migration-map.md` — don't leave a half-wired stub.
7. **PROGRESS LOG.** Append to `core-laravel/docs/CHANGELOG-phase1.md` as you go: completed items, in-flight, decisions (with rationale), blockers.
8. **STAY ON GOAL.** Tempted to also port `documents` or `invoices` because they look easy? **Don't.** Log them in the migration map and move on.
9. **IF BLOCKED.** If Filament 4 + Livewire 3 starter kit has a conflict, log it in the changelog and run everything else in parallel. Do not block all work on one wall.
10. **CHECK SUCCESS BEFORE STOPPING.** Re-read all 11 criteria. Run the 4-screenshot proof set. Only then stop.

---

## QUALITY BAR

- **Code**: PSR-12 via Pint; strict types where Larastan flags it; PHP 8.3 readonly + first-class enums; Eloquent models typed with `protected $casts` for every non-string column; no `mixed` returns; no `@phpstan-ignore` lines.
- **Migrations**: idempotent, reversible (`down()` populated); composite indexes for `(organization_id, status)` patterns; FK constraints with `cascadeOnDelete` only where parent-child is truly cascading (organization → clients yes; user → social_accounts yes; lead → converted_client_id NO — use `nullOnDelete`).
- **Filament resources**: `getEloquentQuery()` overridden to apply tenant scope explicitly (belt and braces beyond global scope); table columns sortable + searchable; no auto-generated forms that include `organization_id` — set it via `mutateFormDataBeforeCreate`.
- **Livewire components**: Volt single-file form where it fits in <120 lines, full-class otherwise; never `wire:model.live` on text inputs (debounce or `.lazy`); use `#[Computed]` for derived state.
- **Tests**: Pest, RefreshDatabase trait, factories not raw `DB::insert`; one `describe()` block per feature; arrange-act-assert, no shared mutable state.
- **Design**: Flux UI components (ship with the Livewire starter kit) — no custom Tailwind component proliferation in Phase 1; Filament uses default theme + brand color override only.
- **Docs**: Every new env var added to `.env.example` with a one-line comment. Every Spatie/3rd-party package addition gets one paragraph in `core-laravel/docs/02-dependencies.md` justifying inclusion.

---

## PHASE 1 PLAN (the /goal deliverable)

Execute in this order. Don't parallelize across phase boundaries; you may parallelize **within** a phase where steps are independent.

### Step 0 — Reconnaissance (~30 min, read-only)

- Read `nucleus-Boilerplate-Audit-and-Vertical-Strategy.md` §0–§1f, §3, §5 in full.
- Read `core-pro/lib/db/schema/professionals.ts`, `clients.ts`, `leads.ts`, `_helpers.ts` to extract column semantics, indexes, soft-delete patterns, and any default-tenant-id columns.
- Read `core-pro/CLAUDE.md` and the root `CLAUDE.md` for project conventions.
- Read 2–3 representative migrations in `core-pro/supabase/migrations/` to see what RLS policies exist (you're NOT porting these — you're noting what they protected so the Laravel policies cover the same surface).
- Write findings to `core-laravel/docs/00-migration-map.md` as a stub before touching code.

### Step 1 — Scaffold (~45 min)

- `cd /Users/narcisbrindusescu/newme/nucleus && laravel new core-laravel --using=laravel/livewire-starter-kit --database=pgsql --git=false`
- Pin versions per §0 in `composer.json` (no `^`, use `~12.0` style minor pins — actually keep `^12.0` for framework but pin Filament, Livewire, Socialite exactly to the minor: `^4.11`, `^3.7`, `^5.24`).
- Install Filament 4, Socialite, Fortify, Pint, Larastan, Pest, Spatie permission + activity-log (document why each in `docs/02-dependencies.md`).
- Run `php artisan filament:install --panels` → panel ID `admin`, path `/admin`.
- Initial commit on a new branch `core-laravel/phase-1`. (Don't push to remote; the user will review locally.)

### Step 2 — Tenancy schema + global scope (~1h)

- Migrations (in this order, separate files):
  1. `create_organizations_table` — `id`, `slug` (unique), `name`, `subscription_status` (string enum), `vertical` ('real_estate' default), `locale` ('ro' default), `timestamps`, `softDeletes`.
  2. `alter_users_table_for_oauth` — make `password` nullable, add `current_organization_id` (nullable FK), `locale` default `ro`.
  3. `create_organization_user_table` — pivot with `organization_id`, `user_id`, `role` (enum string: `owner|admin|agent`), `joined_at`, unique `(organization_id, user_id)`.
  4. `create_social_accounts_table` — exactly per §1d of the audit doc.
- Models: `Organization`, `User` (already exists, extend), `Membership` (pivot model extending `Pivot`), `SocialAccount`.
- `Organization` has `users()` belongsToMany through `organization_user` with `withPivot('role', 'joined_at')`.
- Global scope `BelongsToCurrentOrganization` applied to tenant-scoped models in their `booted()` method.
- Middleware `EnsureOrganizationContext` resolves `auth()->user()->current_organization_id`, binds it to a container singleton `tenant.current_id`, and aborts 404 (NOT 403) if absent on a tenant route.
- Route `/organizations/{organization}/switch` (POST) updates `current_organization_id` after membership check.
- **Verify**: Pest test `tests/Feature/Tenancy/OrganizationSwitchTest.php` proves org B's clients invisible from org A's session.

### Step 3 — Auth: Fortify + Socialite (~1.5h)

- Configure Fortify: enable registration, email verification, password reset, profile updates. Disable 2FA in Phase 1 (note in map).
- `SocialLoginController` ported verbatim from §1d of the audit doc, plus the "attach to currently-authenticated user" branch when `Auth::check()` on callback.
- Routes: `/auth/google/redirect`, `/auth/google/callback`.
- Override Fortify's `RegisterResponse` to create a personal organization on first signup (the user becomes its `owner`).
- **Tests** (must all exist):
  - `RegisterCreatesPersonalOrganizationTest`
  - `GoogleOauthExistingSocialAccountLogsInTest`
  - `GoogleOauthVerifiedEmailLinksToExistingUserTest`
  - `GoogleOauthCreatesUserWithNullPasswordTest`
  - `OauthOnlyUserCanAddPasswordWithoutCurrentTest` (Fortify's `UpdatePassword` flow when hash is null)

### Step 4 — Real-estate CRM core (~2h)

- Migrations:
  - `create_professionals_table` — `organization_id` (FK cascade), `user_id` (FK cascade), `display_name`, `phone`, `bio`, `avatar_path`, `is_active`, `timestamps`. Unique `(organization_id, user_id)`. **Read `core-pro/lib/db/schema/professionals.ts` first and mirror non-trivial columns.**
  - `create_clients_table` — `organization_id`, `assigned_professional_id` (nullable FK, `nullOnDelete`), `full_name`, `email` (nullable), `phone` (nullable), `lifecycle_stage` (string enum: `new|active|viewing|negotiating|closed_won|closed_lost`), `source` (string nullable), `metadata` (jsonb nullable), `timestamps`, `softDeletes`. Composite index `(organization_id, lifecycle_stage)`.
  - `create_leads_table` — `organization_id`, `full_name`, `email`/`phone` (one required, enforce in FormRequest), `source`, `status` (enum: `new|contacted|qualified|converted|disqualified`), `converted_client_id` (nullable FK `nullOnDelete`), `notes`, `metadata` (jsonb), `timestamps`.
- Models with global scope, factories, policies (`view`, `update`, `delete`, `create`: gate on org membership + role for sensitive ops).
- `LeadConversionService` (single class, no abstractions for now): `convert(Lead): Client` — transactional, sets `lead.status='converted'`, populates `lead.converted_client_id`, copies fields. **Use a service class only because two controllers will call it (Filament action + Livewire button) — that's the §2 threshold for promotion out of a controller.**
- **Tests**:
  - Factory smoke: `ClientFactory` and `LeadFactory` produce valid records.
  - `ClientPolicyTest`: agent of org A cannot update/delete org B client.
  - `LeadConversionTest`: lead → client; lead row updated; rollback on failure.

### Step 5 — Filament admin (~1.5h)

- Resources: `OrganizationResource`, `UserResource`, `ProfessionalResource`, `ClientResource`, `LeadResource`.
- Each tenant-scoped resource overrides `getEloquentQuery()` to enforce tenant scope explicitly.
- Auth gate: register a `Gate` for Filament's `canAccessPanel` — only users with `role IN (owner, admin)` on their current org.
- Custom `LeadResource` action "Convert to Client" wired to `LeadConversionService`.
- **Verify**: log in as owner, see 5 seeded clients in `/admin/clients`. Log in as agent (no admin role) — `/admin` returns 403.

### Step 6 — Livewire agent dashboard (~1h)

- Route `/dashboard` (auth + verified middleware).
- Volt component `resources/views/livewire/dashboard.blade.php` — shows the current agent's assigned clients count, leads count, conversion rate this month.
- Volt component `resources/views/livewire/clients/index.blade.php` — filter tabs (`all|active|viewing|closed_won`), paginated table, delete with policy check + Flux UI confirmation modal.
- Use Flux UI components only (`<flux:tabs>`, `<flux:table>`, `<flux:button>`). Do not introduce a custom component library.
- **Verify**: `curl -i http://localhost:8000/dashboard` redirects to login; after login it returns the table with seeded data.

### Step 7 — Docker, Justfile, seed (~45 min)

- `infra/docker-compose.dev.yml` per §3a of the audit doc (postgres + mailpit; redis behind `queue` profile).
- Root `Justfile` per §3b with `db-up`, `laravel-install`, `laravel-up`, `laravel-test`.
- `database/seeders/DemoSeeder.php`: creates one org "Demo Real Estate", one owner (`owner@demo.test`), two agents, 10 clients across lifecycle stages, 15 leads, links 3 leads as already-converted to specific clients.
- **Verify**: `just db-reset && just laravel-install && just laravel-up` brings up a working stack from zero in <3 min.

### Step 8 — Quality gates + proof (~45 min)

- Run `./vendor/bin/pint` then `--test` to confirm clean.
- Run `./vendor/bin/phpstan analyse` at level 6. Fix or annotate per `phpstan.neon` baseline.
- Run `./vendor/bin/pest --parallel`. All green, ≥18 tests.
- Capture proof screenshots into `core-laravel/docs/proof/phase-1/`:
  - `01-admin-clients-list.png`
  - `02-dashboard-agent-view.png`
  - `03-pest-output.txt` (text, not screenshot — paste full output)
  - `04-tenancy-isolation.txt` — output of a `psql` query showing org B's rows + a Pest test log showing org A user gets 0 rows.

### Step 9 — Migration map + handoff (~30 min)

- Finalize `core-laravel/docs/00-migration-map.md` with the table below populated.
- Write `core-laravel/docs/CHANGELOG-phase1.md` summarizing decisions.
- Write `core-laravel/README.md`: how to install, run, test, and what's in Phase 1 vs not.
- Stop. Do **not** start Phase 2.

---

## OUT-OF-PHASE-1 ROADMAP (do not touch this run — catalog only)

| Source `core-pro/lib/db/schema/*` | Target phase | Notes / mapping |
|---|---|---|
| `professionals` | **Phase 1** | Already in scope above |
| `clients` | **Phase 1** | Already in scope above |
| `leads` | **Phase 1** | Already in scope above |
| `audit` | Phase 2 | → `spatie/laravel-activitylog`; trait on every tenant-scoped model |
| `settings` | Phase 2 | Per-org settings table; Filament settings page |
| `services` | Phase 2 | Per-org service catalog (showings, valuations, etc.) |
| `scheduling` | Phase 3 | Appointments = real-estate *showings*; Reverb optional |
| `documents` | Phase 3 | → `spatie/laravel-medialibrary` + R2 disk; signed temporary URLs |
| `notifications` | Phase 4 | DB notifications first; mail later |
| `messaging` | Phase 4 | In-app inbox; SMS/WhatsApp via Twilio later |
| `forms` | Phase 5 | Public form builder; replaces `next-safe-action` flows |
| `marketing` + `micro_sites` | Phase 5 | Per-agent micro-sites (the `[slug]` route in core-pro) |
| `invoices` | Phase 6 | + `pristavu/laravel-anaf` for e-Factura |
| `portal_auth` | Phase 7 | Client portal — re-use Fortify's signed-URL email verification primitives instead of custom magic-link |
| `automations` | Phase 8 | Trigger.dev → Laravel queue + Horizon + scheduler |
| Stripe v22 billing | Phase 6 | → `laravel/cashier`; keep `FEATURE_GATING_ENABLED=false` until verticals ship |
| `@react-pdf/renderer` | Phase 6 | → `spatie/browsershot` (Chromium-based) — better fidelity for invoices |
| `@dnd-kit` (kanban) | Phase 3 | → `livewire-sortable` or Alpine + Sortable.js |
| Supabase Realtime | Phase 7 | → Laravel Reverb; evaluate need first — polling may suffice |

---

## FINAL DELIVERABLE

- ✅ **Confirmation each of 11 success criteria is satisfied** (write a checklist at the end of `CHANGELOG-phase1.md`, each line citing the verifying test or file path).
- 📁 **Every file created/modified**: list paths grouped by area (Tenancy / Auth / CRM / Filament / Livewire / Infra / Docs / Tests).
- 🚀 **How to run**:
  ```
  just db-up
  just laravel-install
  just laravel-up        # http://localhost:8000
  just laravel-test
  ```
  Owner login: `owner@demo.test` / `password` (from seeder). Agent login: `agent1@demo.test` / `password`.
- 📊 **Proof bundle** at `core-laravel/docs/proof/phase-1/` — four artifacts listed in Step 8.
- 📝 **Decisions made + anything to know**: top of `CHANGELOG-phase1.md`. Especially capture:
  - Why Spatie permission + activity-log added now vs later
  - Why a self-rolled tenancy layer rather than `stancl/tenancy` (answer: don't need DB-per-tenant; single DB + global scope is correct for B2B SaaS at this size)
  - Why `current_organization_id` on `users` rather than session-only (answer: survives login refresh + Filament panel + Livewire SSR)
  - The RLS → Policies shift, with a one-paragraph security argument
- ⚠️ **Known limitations + follow-ups**:
  - No Realtime, no Documents, no Invoices, no Portal in Phase 1 (per scope).
  - No 2FA in Fortify config — re-enable in Phase 3 once portal auth lands.
  - No Romanian translations yet — only `locale=ro` set as default; lang files are English fallback.
  - No CI yet — local quality gates green, but `.github/workflows/ci.yml` per §3d of the audit doc is a Phase 2 task.
  - Filament v5 / Livewire v4 / Laravel 13 evaluation deferred ~Sep 2026 per audit doc §"Caveats".

---

## ASSUMPTIONS (made explicit, per CLAUDE.md §1)

1. **Single Laravel app, not the AdonisJS scaffold from the template doc.** The audit recommendation is "default to Laravel" and the CRM-fit analysis confirms it.
2. **No `stancl/tenancy` package.** Hand-rolled global scope is enough for single-DB B2B at this scale; revisit if a customer ever demands data-residency-per-tenant.
3. **No Octane in Phase 1.** PHP-FPM is fine until traffic justifies it.
4. **No Telescope in production**, but install it as `require-dev` for local debugging.
5. **The Livewire starter kit's Flux UI license** is assumed available to the user (Flux Pro components are commercial; free tier covers what Phase 1 needs).
6. **English UI copy in Phase 1**, with `__()` wrappers everywhere so Romanian translation is a Phase-2 string-replace.
7. **`apps/` monorepo prefix from the audit doc is NOT used** — `core-laravel/` lives at the repo root parallel to `core-pro/` because that matches existing nucleus convention (`nucleus-rails-spike/` precedent).

If any of these assumptions turns out to be wrong, log it and proceed with the closest sensible alternative. Do not stop and ask.
