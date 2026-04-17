# FitCore Pro — Fitness & Nutrition Delta Implementation Plan

**Version**: 1.0
**Date**: 2026-04-18
**Author**: Narcis (with architectural assist)
**Status**: Ready for sequential Claude Code execution
**Prerequisite**: Nucleus boilerplate at Session 25 (see `nucleus-Implementation-Plan.md`, `SESSION-25-READINESS.md`)
**Target**: Fully functional CRM for fitness & nutrition professionals (personal trainers, nutritionists, studios), as specified in `FitCorePro-PRD-v1.0.md`
**Baseline code**: `/Users/narcisbrindusescu/newme/nucleus/core-pro/`
**Companion plan**: `EstateCorePro-Delta-Plan-v1.0.md` (parallel vertical built from the same nucleus — use as precedent for pattern decisions)

---

## 0. Purpose, Scope, and How To Use This Document

### 0.1 What this document is

This document specifies the **fitness-and-nutrition-specific delta** to be added on top of the generic "nucleus" (CorePro) boilerplate in order to produce FitCore Pro. It is organized as **twenty sequential sessions (S26 through S45)**, each sized to be completed by Claude Code in a single focused working session (~2–4 hours of real execution time).

Every session is:

1. **Dependency-ordered** — each session builds on previous sessions only. No forward references.
2. **Self-describing** — it tells Claude Code exactly which files to read before starting, what patterns to follow, what to create, and how to verify success.
3. **Atomically deliverable** — each session ends in a commit-ready, demonstrable state.

Together the 20 sessions turn the generic nucleus into a fully functional B2B2C fitness CRM where trainers pay a monthly subscription (Starter / Growth / Pro / Enterprise) and their clients access a branded portal free of charge.

### 0.2 What this document is **not**

- **It is not a rewrite of the FitCorePro PRD.** It assumes the PRD at `docs/FitCorePro-PRD-v1.0.md` is authoritative for *what* the product must do. This document specifies *how* and *in what order* to implement it.
- **It does not re-specify anything the nucleus already provides.** Auth (Clerk v7 + Supabase Third-Party Auth), multi-tenant RLS, Stripe billing with plan gating, real-time messaging, calendar/appointments/iCal, drag-and-drop forms builder, document storage (Supabase Storage), invoice tracking with React-PDF, automation engine with Trigger.dev v4, email campaigns + social templates + lead magnets (Marketing Kit), generic micro-site with themes and contact forms, client portal shell, notifications (in-app + email + web push), analytics with Recharts, i18n with `next-intl`, PWA, Sentry + PostHog + Upstash rate limiting, GDPR endpoints — **all of this is already done**. Sessions below assume it and extend it; they do not rebuild it.
- **It is not a separate codebase.** All work lands in `/core-pro/` alongside the nucleus. The `_niche` placeholders (`lib/db/schema/_niche.ts`, `app/dashboard/_niche/`, `app/portal/_niche/`, `app/[slug]/_niche/`) are the documented extension seams — every session below drops code into them. If EstateCore Pro is also being built in this repo, fitness code lives under sibling namespaces (`lib/actions/fit/`, `lib/db/queries/fit/`, `lib/fit/`, `components/dashboard/fit/`, etc.) — there is no forced mutual exclusivity.
- **It is not optional.** Every session is required to deliver the PRD. Skipping one leaves a hole that a later session assumes closed.

### 0.3 How Claude Code should use this document

For every session, the executor (Claude Code) must:

1. **Load the "Context to Load" list** in that session before writing a single line of code. Every listed file must be read. This is non-negotiable — the nucleus has strict conventions (RLS helpers, `withRLS`, `authedAction`, `pgPolicy` factories, `currentProfessionalIdSql`, `currentClientIdSql`) that are easy to violate if the patterns aren't freshly in context.
2. **Verify preconditions** via the "Dependencies" checklist — confirm prior-session migrations ran, prior-session tables exist, prior-session files are on disk.
3. **Implement tasks in listed order.** Task order within a session is also dependency-ordered.
4. **Answer the "Self-check questions" out loud before submitting.** These flag the three or four things the session is most likely to get wrong.
5. **Run the "Verification" steps** before marking the session complete.
6. **Commit with the convention `session{N}: <summary>`** to match the existing git log style (`session15: invoices`, `session17: marketing`, etc.). Migration files follow `YYYYMMDDHHMMSS_session{N}_<topic>.sql`.

### 0.4 Session map at a glance

| # | Session | Theme | Core deliverable |
|---|---|---|---|
| S26 | Fitness foundations | Vocabulary | Units/enums, muscle groups, equipment, difficulty, locale units helpers |
| S27 | Exercise library | Content | `exercises` + `exercise_muscles` + `exercise_equipment` + seed 500+ + video refs |
| S28 | Food library & nutrition math | Content | `foods` + USDA seed + TDEE/macro helpers + allergen taxonomy |
| S29 | Programs schema | Data model | `programs`+`program_phases`+`workouts`+`workout_exercises` + `program_templates` |
| S30 | Program builder UI | Trainer UX | Wizard, drag-drop reorder, supersets, progressive overload, template library |
| S31 | Program assignment | Connective | `client_programs` + `client_workouts` (per-day instances) + schedule automation |
| S32 | Nutrition builder | Trainer UX | `meal_plans` + `meals` + `meal_items` + builder UI + macro rollups |
| S33 | Recipes & food log | Trainer + Client | `recipes` + shopping list + client-side food log + macro compliance |
| S34 | Measurements & wellness | Client proof | `progress_entries` + `wellness_logs` + charts + export |
| S35 | Progress photos | Emotional proof | Dedicated bucket + `progress_photos` + before/after comparator + consent gates |
| S36 | Workout tracker & PRs | Daily loop | `workout_logs` + `workout_set_logs` + PR detection + streak counters |
| S37 | Client portal fitness | Client UX | Portal `_niche/client` tabs (today, workouts, nutrition, progress) |
| S38 | Gamification | Retention | `badges`+`client_badges`+`challenges`+`challenge_participants` + leaderboards |
| S39 | Client onboarding | First run | Intake form + PAR-Q + initial measurements + before photos + GDPR |
| S40 | Fitness micro-site sections | Acquisition | Transformations gallery, class schedule, service packages, pricing tiers |
| S41 | Fitness marketing kit | Content engine | WOTD social templates, transformation email campaigns, fitness lead magnets |
| S42 | Wearables & imports | Data inflow | Apple Health / Google Fit / MyFitnessPal import + sync jobs |
| S43 | Fitness automations & analytics | Intelligence | Fitness triggers/actions + weekly check-in report + fitness KPIs + AI stubs |
| S44 | End-to-end testing | Quality | Playwright specs covering trainer + client golden paths |
| S45 | Credentials & go-live | Production | All API keys, Stripe products, deployment, monitoring |

### 0.5 Golden thread

**The assign → log → adjust loop is the product's soul.** The trainer's weekly output is programs and meal plans (S29–S33). The client's weekly compliance proof is measurements, photos, and workout logs (S34–S36). Every other feature — micro-site, marketing kit, gamification, automations — exists to attract clients into this loop and keep them inside it. When in doubt about a design decision, ask: does this help the trainer deliver a better program, or does this help the client prove they're making progress? If neither, deprioritize it.

Contrast this with EstateCore Pro's golden thread (the exclusive contract). Real estate is *transactional* — sign once, execute once. Fitness is *recurrent* — assign weekly, log daily, photograph monthly, renew forever. The data model and UX must therefore emphasize cadence and visible accumulation; progress is what a client pays to see.

---

## 1. Prerequisites — State of the Nucleus

Do not start S26 until the following are verified true:

### 1.1 Code state

- `core-pro/` builds (`npm run build`) without TypeScript errors.
- `npm run db:generate` (Drizzle) followed by `npx supabase db push` (Supabase CLI) reports no pending migrations; latest applied migration is `20260417100000_session25_rls_fixes.sql` or later.
- `npm run dev` starts successfully at `http://localhost:3000`.
- Dashboard at `/dashboard` is reachable by a signed-in professional; portal at `/portal` is reachable by an invited client.
- Stripe webhooks verify locally (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`).
- Clerk webhooks verify (Svix dashboard or `ngrok`).
- Playwright smoke test `tests/e2e/smoke.spec.ts` passes.

### 1.2 Known S25-era gaps to address opportunistically (not blocking)

These are flagged in `SESSION-25-READINESS.md`. They should be fixed as part of S26–S28 where relevant:

- `types/database.ts` is still a stub — regenerate with `npx supabase gen types typescript --local > types/database.ts` after each new migration in this plan.
- `next.config.ts` `images.remotePatterns` — add `*.supabase.co`, YouTube thumbnail hosts (`i.ytimg.com`), and Vimeo (`i.vimeocdn.com`) for exercise video thumbnails used in S27.
- The `updated_at` trigger must be attached **in each new migration** that adds a table with an `updated_at` column (see S27 template). `9903_triggers.sql` does NOT re-run on incremental pushes.
- i18n: every new UI string in sessions below must be added to `messages/ro.json` (primary) and `messages/en.json` (secondary). No hardcoded Romanian or English strings.
- Public form rate-limit (`publicFormRateLimit`) should be wired to S39's onboarding-accept endpoint and S40's micro-site class-RSVP endpoint.

### 1.3 Branching & commits

- Work on `main` as per git log style. One commit per session minimum; squash WIP commits before session close.
- Migration files MUST be part of the same commit as the code that depends on them — never commit the migration in isolation.

---

## 2. Architecture Strategy — How Fitness Layers on the Nucleus

### 2.1 The one-sentence architecture

Fitness is the nucleus **plus** two content libraries (`exercises`, `foods`), **plus** a program-delivery spine (`programs` → `program_phases` → `workouts` → `workout_exercises`, assigned to clients via `client_programs` and materialized into `client_workouts`), **plus** a nutrition spine (`meal_plans` → `meals` → `meal_items` → `recipes`), **plus** a client-proof surface (`progress_entries`, `progress_photos`, `wellness_logs`, `workout_logs`, `workout_set_logs`), **plus** gamification (`badges`, `client_badges`, `challenges`), **plus** fitness-specific UIs under `_niche/`, **plus** optional wearable integrations.

### 2.2 Where everything lives

```
core-pro/
├── lib/db/schema/
│   ├── _niche.ts                    # (existing placeholder — keep for unrelated verticals)
│   ├── fit_enums.ts                 # S26 (difficulty, transaction unit, body sides, etc.)
│   ├── fit_muscles_equipment.ts     # S26 (muscle_groups, equipment)
│   ├── exercises.ts                 # S27
│   ├── foods.ts                     # S28
│   ├── programs.ts                  # S29 (programs + phases + workouts + workout_exercises)
│   ├── client_programs.ts           # S31 (client_programs + client_workouts)
│   ├── meal_plans.ts                # S32 (meal_plans + meals + meal_items)
│   ├── recipes.ts                   # S33
│   ├── food_logs.ts                 # S33 (client_food_log_entries + water_intake)
│   ├── progress.ts                  # S34 (progress_entries + body_measurements)
│   ├── wellness_logs.ts             # S34
│   ├── progress_photos.ts           # S35
│   ├── workout_logs.ts              # S36 (workout_logs + workout_set_logs + personal_records)
│   ├── gamification.ts              # S38 (badges, client_badges, challenges, challenge_participants, streaks)
│   ├── wearables.ts                 # S42 (device_connections + device_data_points)
│   └── fit_commission_records.ts    # optional — mirrors nucleus invoice tracking for packages
│
├── lib/actions/fit/                 # New subfolder — all fitness actions
│   ├── exercises.ts | foods.ts | programs.ts | client-programs.ts | meal-plans.ts
│   ├── recipes.ts | food-logs.ts | progress.ts | progress-photos.ts
│   ├── workout-logs.ts | gamification.ts | wearables.ts
│
├── lib/db/queries/fit/              # New subfolder — all fitness queries
│   └── <same list>
│
├── lib/fit/                         # Fitness subsystems
│   ├── units.ts                     # metric <-> imperial conversions (kg/lb, cm/in, kcal/kJ)
│   ├── tdee.ts                      # Harris-Benedict, Mifflin-St Jeor, Katch-McArdle
│   ├── macros.ts                    # macro split helpers (40/30/30, keto, custom)
│   ├── program-engine.ts            # progression logic, volume/intensity calculators
│   ├── program-builder-validate.ts  # server-side wizard validation
│   ├── workout-materializer.ts      # expands a program into `client_workouts` rows
│   ├── pr-detector.ts               # detects 1RM / volume / rep PRs on set log insert
│   ├── streak-engine.ts             # streak counters + "at-risk" detection
│   ├── meal-plan-generator.ts       # (stub in S32, real in S43 with AI)
│   ├── shopping-list.ts             # rollup of meal_items → aisle-grouped list
│   ├── progress-photo-pipeline.ts   # resize + EXIF strip + watermark
│   ├── photo-privacy.ts             # per-photo ACL helper
│   ├── badges/
│   │   └── rules.ts                 # declarative badge rules
│   ├── reports/
│   │   ├── client-weekly-recap.tsx  # PDF shown to client & trainer (S43)
│   │   └── trainer-compliance.tsx   # trainer-side PDF (S43)
│   ├── wearables/
│   │   ├── apple-health.ts          # HealthKit import (S42)
│   │   ├── google-fit.ts            # Google Fit import (S42)
│   │   ├── myfitnesspal.ts          # food-log bulk import (S42)
│   │   └── provider.ts              # abstraction
│   └── ai/
│       ├── workout-generator.ts     # Anthropic Claude Sonnet 4.6 for program drafting (S43)
│       ├── meal-plan-generator.ts   # (S43)
│       └── smart-insights.ts        # plateau detection, adherence warnings (S43)
│
├── app/dashboard/_niche/
│   ├── exercises/                   # S27 (library CRUD)
│   ├── foods/                       # S28
│   ├── programs/                    # S29–S31
│   ├── nutrition/                   # S32–S33
│   ├── clients/[id]/fit/            # S34+ (fitness tabs on client profile)
│   ├── gamification/                # S38
│   ├── wearables/                   # S42 (settings view)
│   └── ai-assistant/                # S43 (if AI features enabled)
│
├── app/portal/_niche/
│   ├── today/                       # S37 (fitness home)
│   ├── workouts/                    # S37 + S36
│   ├── nutrition/                   # S37 + S33
│   ├── progress/                    # S34+S35
│   ├── achievements/                # S38
│   └── library/                     # client-accessible recipe & exercise library
│
├── app/[slug]/_niche/
│   ├── transformations/             # S40 (public gallery)
│   ├── classes/                     # S40 (public group class schedule)
│   ├── packages/                    # S40 (service packages / pricing tiers)
│   └── lead-magnet/[id]/            # S41 (fitness-specific lead magnet landers)
│
├── components/dashboard/fit/
├── components/portal/fit/
├── components/micro-site/fit/
│
├── trigger/jobs/fit/
│   ├── materialize-weekly-workouts.ts  # S31
│   ├── check-in-reminder.ts            # S39 + S34 (Sunday evening)
│   ├── meal-plan-rollover.ts           # S32 (Sunday for variant week toggling)
│   ├── photo-reminder.ts               # S35 (every 2/4 weeks per trainer setting)
│   ├── badge-evaluator.ts              # S38 (daily sweep + event-driven)
│   ├── streak-at-risk.ts               # S38 (daily 20:00 local)
│   ├── wearable-sync-poller.ts         # S42
│   ├── weekly-client-recap.ts          # S43 (Sunday 20:00 local)
│   ├── trainer-compliance-digest.ts    # S43 (Monday 07:00 local)
│   └── ai-plan-draft.ts                # S43
│
└── supabase/migrations/
    └── 20260418*_session26_fit_enums.sql  # ...onwards
```

### 2.3 Naming convention for the delta

- **Tables**: No prefix. `exercises`, `programs`, `workouts`, `meal_plans` — not `fit_exercises`. This matches the nucleus (no `core_` prefix on anything). Exception: tables that clash with nucleus vocabulary (e.g., the nucleus `services` generic vs. fitness `services`) keep their generic name — fitness adds `service.metadata.fitness_type`. The `metadata jsonb` discriminator is the extension pattern.
- **Where fitness and RE could collide in the same monorepo**: namespace files with `fit_` prefix for ambiguous ones (`fit_enums.ts`, `fit_muscles_equipment.ts`). Domain tables themselves stay unprefixed because fitness tables don't collide with the RE set defined in `EstateCorePro-Delta-Plan-v1.0.md`.
- **Schema files**: one file per domain table or tight cluster. `programs.ts` holds `programs` + `program_phases` + `workouts` + `workout_exercises` + `program_templates` (tight cluster).
- **RLS policy names**: `<table>_professional_all` for owner access, `<table>_client_select` for portal read access, `<table>_system_select` for public system content (e.g., system-seeded exercises that all trainers can read but not edit).
- **Migration files**: `YYYYMMDDHHMMSS_session{NN}_<topic>.sql` — e.g., `20260418103000_session27_exercises.sql`. Drizzle generates the timestamp; rename the file to add the session suffix for greppability.
- **Plan limit keys**: `max_clients` stays (the fitness PRD sizes plans by active-client count per PRD 1.4). Add `max_programs_per_client` (Growth: 3, Pro: unlimited), `max_exercise_library_custom` (Starter: 25, Growth: 250, Pro: unlimited), `max_progress_photo_storage_mb` (Starter: 200, Growth: 2000, Pro: 10000). Register in `lib/stripe/plans.ts` in S27 and S35.

### 2.4 RLS pattern (must be followed on every new table)

Every tenant-scoped table added in S26–S43 MUST have:

```ts
import { pgTable, uuid, text, timestamp, pgPolicy, index } from "drizzle-orm/pg-core";
import { authenticatedRole, anonRole } from "drizzle-orm/supabase";
import { sql } from "drizzle-orm";
import { professionals } from "./professionals";
import { createdAt, updatedAt, currentProfessionalIdSql } from "./_helpers";

export const programs = pgTable(
  "programs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    // ...domain columns...
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({
    professionalIdIdx: index("idx_programs_professional_id").on(t.professionalId),
    professionalAll: pgPolicy("programs_professional_all", {
      as: "permissive",
      for: "all",
      to: authenticatedRole,
      using: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
      withCheck: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
    }),
    // Client-read policies added per-table as needed (see S31, S33, S34)
  })
);
```

And in the generated migration, add the `updated_at` trigger:

```sql
CREATE TRIGGER set_updated_at_programs
  BEFORE UPDATE ON programs
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
```

### 2.5 What the nucleus provides to the delta (do not rebuild)

| Need | Use |
|---|---|
| Tenant isolation | `withRLS()` in `lib/db/rls.ts`; `authedAction` factory in `lib/actions/safe-action.ts` |
| Auth | Clerk v7 + `currentProfessionalIdSql`, `currentClientIdSql` helpers |
| Professional identity | `professionals` table; fitness reuses this as "trainer/coach" |
| Client identity | `clients` + `professional_clients` junction; fitness reuses unchanged; fitness-specific profile fields live in `clients.metadata` first then graduate to real columns via an S27 migration if stability demands |
| Scheduling | `appointments` + `availability_slots` — fitness sessions (1:1, group, online) reuse these; fitness adds no scheduling tables |
| Calendar & iCal | `.ics` attachments, iCal feed, 24h/1h reminders via Trigger.dev — reused for training sessions |
| Forms | Pre-built templates — fitness adds intake, PAR-Q, weekly check-in, NPS (S39) as seeded templates |
| Documents | Supabase Storage + `documents` table — fitness reuses for medical analyses, consent forms, body composition reports |
| Messaging | `conversations` + `messages` — one thread per trainer-client pair, reused unchanged; fitness optionally extends with voice-note UX in S36 |
| Notifications | `sendNotification()` multi-channel — fitness adds new `type` values (`workout_assigned`, `meal_plan_updated`, `pr_set`, `streak_at_risk`, etc.) |
| Automations | Generic trigger/action engine — fitness registers new triggers (`workout_completed`, `pr_achieved`, `check_in_missed`, `streak_broken`, `goal_milestone_reached`) and new action types (`assign_program`, `send_workout_plan_pdf`, `grant_badge`, `create_check_in_task`) |
| Marketing kit | Email campaigns, social templates, lead magnets — fitness adds new template categories: motivational, educational, transformation, service promotion |
| Micro-site | `app/[slug]/` already renders; fitness injects new section types (`transformations`, `class_schedule`, `service_packages`, `trainer_bio`) and adds `app/[slug]/_niche/transformations`, `classes`, `packages` routes |
| Portal shell | `app/portal/` already branded; fitness adds `_niche/today`, `_niche/workouts`, `_niche/nutrition`, `_niche/progress`, `_niche/achievements` page trees |
| Invoices | Generic invoice CRUD + PDF — re-used for package sales (pachet 10 sesiuni), monthly memberships |
| Stripe billing | Plan gating — fitness adds `max_programs_per_client`, `max_exercise_library_custom`, `max_progress_photo_storage_mb` limits |
| i18n | `messages/ro.json` + `messages/en.json` — fitness adds new keys under `fit.*` namespace |
| Analytics | Recharts framework — fitness adds new KPI queries (compliance, retention, adherence) |
| PWA | All already configured — fitness benefits automatically; S37 adds offline-viewable workout pages |

### 2.6 What is not in the nucleus and must be added by the delta

- Exercise and food content libraries with rich metadata (muscle groups, equipment, macros) and large system seeds (S27, S28).
- TDEE / macronutrient math helpers (S28).
- Program-to-client materialization pipeline that expands a template into scheduled workouts (S31).
- Progress-photo pipeline — resize, EXIF strip, optional watermark, consent-aware visibility (S35).
- PR (personal record) detection (1RM, volume, rep PRs) (S36).
- Gamification rule engine — badges, streaks, challenges (S38).
- Wearable integrations (Apple Health, Google Fit, MyFitnessPal) (S42).
- Fitness-specific AI generators + smart insights using Anthropic Claude (S43).
- Watermarked before/after comparator UI with client consent gate (S35).

---

## 3. External Services & Credentials Matrix

This is the full list of external services used once S26–S45 are complete. Rows flagged "new vs nucleus" did not exist before this plan. S45 is the dedicated session for finalizing all credentials; this table is a pointer.

| Service | Role | New? | Account needed | Env vars added in |
|---|---|---|---|---|
| Clerk | Auth + Organizations | no | existing | — |
| Supabase | DB + Storage + Realtime | no | existing | — |
| Stripe | Subscriptions | no | existing | S27 adds `STRIPE_*_PRICE_ID` per fitness plan if pricing diverges from nucleus |
| Resend | Email | no | existing | — |
| Upstash Redis | Rate limiting | no | existing | — |
| Trigger.dev v4 | Jobs | no | existing | — |
| Sentry | Errors | no | existing | — |
| PostHog | Analytics + flags | no | existing | — |
| Anthropic Claude API | AI workout/meal generation | **yes** | new account, Claude Sonnet 4.6 for drafting, Claude Opus 4.7 for deep plan reviews | S43 |
| USDA FoodData Central | Food nutrition seed | **yes** | free public API key | S28 |
| YouTube Data API | Exercise video embeds | optional | free tier; only needed if auto-fetching thumbnails | S27 |
| Apple HealthKit (via Sign in with Apple) | Client activity import | **yes** | Apple Developer account; HealthKit entitlement on native companion (stubbed as PWA + manual in MVP) | S42 |
| Google Fit REST API | Client activity import | **yes** | Google Cloud project + OAuth client | S42 |
| MyFitnessPal (unofficial) | Food log import | **yes** | community API wrapper; evaluate risk | S42 |
| Garmin / Whoop / Fitbit / Oura | Activity / sleep / recovery | out of scope for v1 | — | — (roadmap) |

Consolidated `.env` additions over the delta:

```bash
# S27 — Exercise library
YOUTUBE_API_KEY=...                   # optional; only if we want server-fetched thumbnails

# S28 — Food library
USDA_API_KEY=...                      # free via api.data.gov

# S42 — Wearables
GOOGLE_FIT_CLIENT_ID=...
GOOGLE_FIT_CLIENT_SECRET=...
APPLE_HEALTH_TEAM_ID=...              # if/when native companion ships
APPLE_HEALTH_BUNDLE_ID=...
MYFITNESSPAL_USER_AGENT=...           # required header for MFP community endpoints

# S43 — AI features
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL_DRAFT=claude-sonnet-4-6
ANTHROPIC_MODEL_REVIEW=claude-opus-4-7
AI_FEATURES_ENABLED=true              # kill switch

# S43 — Cron for weekly recaps
CRON_SECRET_FIT=...                   # rotate separate from main CRON_SECRET
```

Update `lib/env.ts` each session to validate the new keys.

---

## 4. Naming & Convention Recap (for Claude Code's quick reference)

Before any session, Claude Code should be able to recite these from memory:

1. **Every new tenant table**: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE`, `created_at` + `updated_at` (via `createdAt()` / `updatedAt()` factories), RLS enabled, `<table>_professional_all` policy, `updated_at` trigger in the migration, index on `professional_id`.
2. **System/shared content tables** (exercises, foods, muscle_groups, equipment): `owner_type text check (owner_type in ('system','trainer'))`; system rows have `professional_id = NULL`; RLS: `select` open to authenticated; `insert/update/delete` scoped to owner professional; service role only may modify system rows.
3. **Client-visible rows** (e.g., workouts assigned to a client): add a `<table>_client_select` policy scoped via a subquery joining `professional_clients` or a direct `client_id` check.
4. **Server actions**: use `authedAction` for everything. Never call Drizzle directly outside `withRLS` except in Trigger.dev jobs (which use `dbAdmin`).
5. **Queries**: `lib/db/queries/fit/<domain>.ts`, one function per logical read. Always accept a `Tx` parameter so it composes with `withRLS`.
6. **Types**: add to `types/domain.ts` using `InferSelectModel<typeof table>`. Fitness-specific helper types (e.g., `ProgramWithPhases`, `ClientDayView`) go under `types/fit/` sub-folder.
7. **i18n**: all UI strings go through `useTranslations('fit.<namespace>')`. Add keys to both `ro.json` and `en.json`.
8. **Feature flag before plan gate**: new UI modules wrap in `<FeatureFlag flag="fit_<module>">{children}</FeatureFlag>` (PostHog) AND in `<PlanGate feature="fit_<module>">`. Add the flag to `lib/posthog/flags.ts` and the feature to `lib/stripe/plans.ts`.
9. **Sentry tag**: all new server actions declare an `actionName` prefix `fit.<module>.<verb>` (e.g., `fit.programs.create`, `fit.workoutLog.submit`).
10. **PostHog event**: client-side every meaningful fitness action emits `fit.<object>.<verb>` (e.g., `fit.program.assigned`, `fit.workout.completed`, `fit.pr.achieved`, `fit.photo.uploaded`, `fit.streak.broken`).
11. **Migration test**: after adding any RLS policy, write a smoke test that (a) the professional can do the action, (b) another professional cannot, (c) a different client cannot, (d) the owning client can (where intended), (e) an anon user cannot (or can, if policy intends it).
12. **Unit handling**: every weight/length column is stored in metric (kg, cm). Display-side conversions use `lib/fit/units.ts` based on `clients.locale_units` (default: metric for RO, imperial for US/UK clients). Never store dual-unit — convert at the boundary only.

---

# Sessions

---

## Session 26 — Fitness Foundations (Vocabulary, Enums, Units)

### Goal
Establish the vocabulary every subsequent session depends on: enums for difficulty / workout type / meal type / body side / transaction-unit, two shared content tables (`muscle_groups`, `equipment`), a unit-conversion helper (`lib/fit/units.ts`), and locale-aware display formatters. No UI in this session — strictly schema + helpers + seed. This is the lightest session of the plan; it exists to prevent every later session from inventing its own vocabulary.

### Why this order
Exercises (S27), workouts (S29), nutrition (S28, S32), and workout logs (S36) all reference muscle groups, equipment, difficulty, and units. Placing these facts once avoids churn.

### Context to Load
- `lib/db/schema/_helpers.ts` (timestamp factories, JWT claim helpers, `anonRole`, `authenticatedRole`).
- `lib/db/schema/_enums.ts` if it exists; otherwise create.
- `lib/db/rls.ts` (withRLS pattern).
- `lib/i18n/config.ts` (locale conventions, default timezone, currency).
- `supabase/migrations/0001_functions.sql` (how shared SQL functions are added).
- `lib/env.ts` (how env vars are validated).
- The PRD sections 4.3 (`foods`, `exercises`, `workouts` referenced), 5.3.1 (program structure).

### Dependencies
- Nucleus at S25.

### External Services
None.

### Data Model

**Enums** (create or extend `lib/db/schema/_enums.ts`):
- `difficultyLevelEnum` — `beginner | intermediate | advanced | elite`.
- `workoutTypeEnum` — `strength | hypertrophy | power | endurance | hiit | mobility | rehab | cardio | circuit | custom`.
- `mealTypeEnum` — `breakfast | mid_morning | lunch | snack_afternoon | dinner | evening_snack | pre_workout | post_workout | other`.
- `bodySideEnum` — `left | right | bilateral`.
- `setTypeEnum` — `working | warmup | dropset | amrap | emom | failure | rest_pause | rir`.
- `localeUnitsEnum` — `metric | imperial`.
- `sexEnum` — `male | female | other | prefer_not_to_say`.

**Tables**:

**`muscle_groups`** (shared):
- `id uuid` PK
- `name text NOT NULL` (e.g., "Chest", "Quadriceps")
- `name_ro text NOT NULL` (localized Romanian name)
- `code text NOT NULL UNIQUE` (slug: `chest`, `quads`)
- `region text NOT NULL` — `upper_body | lower_body | core | full_body`
- `display_order smallint`
- Not tenant-scoped. RLS: select open to authenticated + anon; service role insert/update.

**`equipment`** (shared):
- `id uuid` PK
- `name text NOT NULL`, `name_ro text`, `code text UNIQUE`
- `category text` — `free_weights | machine | bodyweight | cardio | functional | rehab | accessories`
- `display_order smallint`
- Not tenant-scoped. Same RLS as `muscle_groups`.

Seed: 20 muscle groups (all major heads), 40+ equipment codes (barbell, dumbbell, kettlebell, cable, smith, squat rack, bench, treadmill, rower, bike, row machine, resistance band, trx, pull-up bar, medicine ball, slam ball, battle rope, box, plyo box, step, foam roller, lacrosse ball, band, chains, belt, wraps, straps, etc.).

### Tasks (in order)

1. **Create `lib/db/schema/fit_enums.ts`** with all enums above; export from `lib/db/schema.ts`.
2. **Create `lib/db/schema/fit_muscles_equipment.ts`** with the two shared tables + RLS policies.
3. **Generate migration** `YYYYMMDDHHMMSS_session26_fit_foundations.sql`; add `updated_at` triggers.
4. **Seed data**: append seed rows to `supabase/seed.sql` (idempotent via `ON CONFLICT DO NOTHING`). Both English and Romanian names populated.
5. **Create `lib/fit/units.ts`**:
   - `kgToLb(n)` / `lbToKg(n)` / `cmToIn(n)` / `inToCm(n)` / `kcalToKj(n)` / `kjToKcal(n)`.
   - `formatWeight(kg, units, locale)` → `"75 kg"` or `"165.3 lb"`.
   - `formatBodyLength(cm, units, locale)` → `"182 cm"` or `"5'11.7\""`.
   - `formatEnergy(kcal, locale)` → `"2,400 kcal"` (always kcal; kJ optional).
   - `parseWeightInput(value, units)` returns kg.
6. **Add `clients.metadata.locale_units`** convention — documented as a soft column accessed via helper `getClientUnits(client)` that returns `client.metadata.locale_units ?? (client.locale === 'en' ? 'imperial' : 'metric')`. No schema change required; fitness reads it via helper. (Promote to a dedicated column in S39 if stability demands.)
7. **Add `lib/fit/body-regions.ts`** — a tiny constant map `REGION_TO_MUSCLE_CODES` for grouping exercises by region in the program builder UI.
8. **Regenerate `types/database.ts`**.
9. **Smoke test** — `tests/fit/units.spec.ts`: unit math round-trips within tolerance.

### RLS Policies

```ts
// muscle_groups, equipment — shared platform data
pgPolicy("muscle_groups_public_select", {
  as: "permissive", for: "select",
  to: [anonRole, authenticatedRole],
  using: sql`true`,
});
pgPolicy("muscle_groups_admin_all", {
  as: "permissive", for: "all",
  to: sql`service_role`,
  using: sql`true`,
});
// (analogous for equipment)
```

### Verification

- `SELECT count(*) FROM muscle_groups;` >= 20.
- `SELECT count(*) FROM equipment;` >= 40.
- `kgToLb(100)` ≈ 220.462; `lbToKg(220.462)` ≈ 100 (round-trip < 0.001).
- Build passes; typegen passes.

### Self-check questions for Claude Code

1. Did I seed Romanian translations for every muscle group and equipment row? (Localization is cheaper now than later.)
2. Is every enum added to BOTH `fit_enums.ts` AND the generated Postgres enum type? (Drizzle handles this; verify with `SELECT typname FROM pg_type WHERE typname LIKE '%_enum'`.)
3. Did I avoid creating a `units` table? (Units are enum + helpers; a table would be over-engineered.)
4. Are the unit conversions symmetric and locale-independent? (They must be pure functions — no locale side effects.)
5. Is `locale_units` discoverable in code review? (Add a `// docs: see lib/fit/units.ts` comment on `clients.metadata` fallback helper.)

---

## Session 27 — Exercise Library

### Goal
Build the exercise content layer: a hybrid **system + trainer-custom** library with rich metadata (muscle groups, equipment, difficulty, video references, instructions, cautions). System exercises are seeded from a curated list of 500+ movements; trainer exercises are owned by the professional and stored alongside. Dashboard UI for browsing / creating / editing / archiving exercises is built here — subsequent sessions reference an existing UI.

### Why this order
Programs (S29) depend on exercises. Workout logs (S36) depend on exercises. Both the builder UI and the portal workout tracker need to search, filter, and paginate an exercise catalogue. S26 provided the vocabulary; S27 populates the library.

### Context to Load

- S26 schema + seeds (`muscle_groups`, `equipment`).
- `lib/db/schema/services.ts` — closest existing analogue for a tenant+public hybrid (has `_professional_all` + `_public_select` policies).
- `lib/db/schema/documents.ts` — for storage-bucket-per-file patterns (videos/photos).
- `supabase/migrations/9900_storage_buckets.sql` + `9901_storage_policies.sql`.
- `lib/stripe/plans.ts` — where `max_exercise_library_custom` will plug in.
- PRD 5.3.2 ("Biblioteca de exerciții").

### Dependencies
- S26.

### External Services
- Optional: YouTube Data API for thumbnail fetching (not blocking).

### Data Model

**`exercises`** (hybrid: `owner_type system` or `trainer`):

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `owner_type` | text NOT NULL check in ('system','trainer') | |
| `professional_id` | uuid FK → professionals nullable | NULL iff `owner_type='system'` |
| `name` | text NOT NULL | |
| `name_ro` | text nullable | localized Romanian display name |
| `slug` | text | unique per owner scope — enforce via partial unique index |
| `description` | text nullable | coaching cues |
| `instructions` | jsonb | ordered list `[{step: number, text: string}]` |
| `difficulty` | `difficulty_level_enum` | default `intermediate` |
| `primary_muscle_group_id` | uuid FK → muscle_groups | |
| `cautions` | text nullable | contraindications (e.g., "lower back issues") |
| `category` | text | `compound | isolation | cardio | stretch | plyo | rehab` |
| `mechanics` | text | `push | pull | squat | hinge | carry | rotation | static` |
| `unilateral` | boolean default false | |
| `video_url` | text nullable | YouTube / Vimeo / direct mp4 |
| `video_embed_provider` | text nullable | `youtube | vimeo | direct` |
| `thumbnail_url` | text nullable | |
| `animated_gif_url` | text nullable | optional fallback |
| `tempo_default` | text nullable | e.g., `3-1-X-1` |
| `rep_range_default` | text nullable | e.g., `8-12` |
| `rest_seconds_default` | smallint nullable | |
| `is_active` | boolean default true | soft-delete flag |
| `is_verified` | boolean default false | system-approved badge; trainer custom start false |
| `metadata` | jsonb default '{}' | extension bucket |
| `created_at, updated_at` | | |

**`exercise_muscles`** (junction — primary mover + synergists):
- `exercise_id` FK cascade, `muscle_group_id` FK, `role text` (`primary | synergist | stabilizer`), `pct` smallint nullable (relative engagement 0..100).
- PK `(exercise_id, muscle_group_id, role)`.

**`exercise_equipment`** (junction):
- `exercise_id` FK cascade, `equipment_id` FK.
- PK `(exercise_id, equipment_id)`.

**`exercise_substitutions`**:
- `from_exercise_id`, `to_exercise_id`, `rationale text`, `quality smallint` (1..5).
- PK `(from_exercise_id, to_exercise_id)`.

Indexes:
- `idx_exercises_owner_professional` on `(owner_type, professional_id)`.
- `idx_exercises_active_verified` partial `WHERE is_active AND is_verified`.
- `idx_exercises_primary_muscle` on `(primary_muscle_group_id)`.
- Trigram index on `name` + `name_ro` for search (enable `pg_trgm`).

**Storage**: reuse `media` bucket with folder `exercises/<exercise_id>/` for trainer-uploaded video/gif; the `exercises_bucket_public_read` policy mirrors `properties` bucket pattern (see EstateCore S27) — select allowed only when `is_active = true`.

### Tasks (in order)

1. `CREATE EXTENSION IF NOT EXISTS pg_trgm;` in migration prelude (if not already present).
2. Create `lib/db/schema/exercises.ts` with the four tables above + RLS + indexes.
3. Generate migration; add `updated_at` triggers.
4. **Seed 500+ system exercises** via a seed script `scripts/seed-exercises.ts`:
   - Start from a curated open dataset (MuscleWiki / wger.de / ExRx.net — verify license; the MVP can ship with 200 in-house rows if external licensing blocks).
   - Each row: name, description, primary muscle, equipment, category, mechanics, 3–5 instruction steps, YouTube embed URL where available, cautions where relevant.
   - Include Romanian translations for top 150.
   - Idempotent (`ON CONFLICT (slug) WHERE owner_type='system' DO NOTHING`).
5. **Storage bucket policy** — add `exercises/` folder policy on the `media` bucket:
   ```sql
   create policy "exercises_media_public_read" on storage.objects for select
     using (
       bucket_id = 'media' and
       (storage.foldername(name))[1] = 'exercises' and
       (storage.foldername(name))[2] in (
         select id::text from public.exercises where is_active = true
       )
     );
   ```
6. **Actions** in `lib/actions/fit/exercises.ts`:
   - `createExercise(input)` — plan-limit gate on `max_exercise_library_custom`; slug auto-generated; primary muscle + at least one equipment required.
   - `updateExercise(id, patch)`.
   - `archiveExercise(id)` / `restoreExercise(id)` (soft-delete).
   - `uploadExerciseVideo(exerciseId, file)` — Supabase Storage; 200 MB limit.
   - `cloneSystemExercise(systemId)` — makes an editable trainer copy with a forked slug.
   - `addSubstitution(fromId, toId, rationale, quality)`.
7. **Queries** in `lib/db/queries/fit/exercises.ts`:
   - `listExercises({ professionalId, search, muscleGroupId, equipmentIds[], difficulty, ownerType, page, limit })` — joins muscles + equipment; returns paginated.
   - `getExercise(id)` — single with all joins including substitutions.
   - `searchExercisesTrigram(q, professionalId)` — search endpoint for program-builder autocomplete.
8. **Routes** under `app/dashboard/_niche/exercises/`:
   - `page.tsx` — list with filters [muscle, equipment, difficulty, owner], search, Archive toggle.
   - `new/page.tsx` — create form.
   - `[id]/page.tsx` — detail/edit with video preview, substitutions tab.
9. **Components** in `components/dashboard/fit/exercises/`:
   - `ExerciseGrid.tsx`, `ExerciseCard.tsx`, `ExerciseFilters.tsx`, `ExerciseForm.tsx`, `VideoEmbed.tsx` (YouTube/Vimeo/direct), `SubstitutionPicker.tsx`, `MusclePicker.tsx` (anatomical diagram toggle), `EquipmentPicker.tsx` (chip multi-select).
10. **Nav**: add `exercises` entry to `components/dashboard/nav-items.ts` NICHE_NAV (icon `Dumbbell`).
11. **i18n keys** — `fit.exercises.*` namespace in `messages/ro.json` + `en.json`.
12. **Feature flag** — `fit_exercise_library` default ON.
13. **PostHog events** — `fit.exercise.created`, `fit.exercise.video_uploaded`, `fit.exercise.cloned_from_system`.
14. **Plan-limit entry** — add `maxExerciseLibraryCustom` to `lib/stripe/plans.ts`: Starter 25, Growth 250, Pro/Enterprise Infinity.
15. Regenerate `types/database.ts`.

### RLS Policies

```ts
// exercises
pgPolicy("exercises_system_select", {
  as: "permissive", for: "select",
  to: [anonRole, authenticatedRole],
  using: sql`${t.ownerType} = 'system' and ${t.isActive} = true`,
}),
pgPolicy("exercises_professional_all", {
  as: "permissive", for: "all",
  to: authenticatedRole,
  using: sql`${t.ownerType} = 'trainer' and ${t.professionalId} = ${currentProfessionalIdSql}`,
  withCheck: sql`${t.ownerType} = 'trainer' and ${t.professionalId} = ${currentProfessionalIdSql}`,
}),
pgPolicy("exercises_client_select", {
  // client can read exercises that appear in their assigned workouts — enforce at query layer (S31)
  // this policy permits any authenticated select to not over-block; query always joins through client_workouts
  as: "permissive", for: "select",
  to: authenticatedRole,
  using: sql`${t.isActive} = true`,
}),
// exercise_muscles / exercise_equipment / exercise_substitutions — inherit from parent
```

### Verification

- Seed runs cleanly; `SELECT count(*) FROM exercises WHERE owner_type='system';` ≥ 200 (ideally 500+).
- Trainer creates a custom exercise; another trainer cannot read it.
- System exercise visible to all authenticated users.
- `searchExercisesTrigram('squat', …)` returns bench press ≠ squat (trigram fuzzy works).
- Plan limit enforced on creation.

### Self-check questions

1. Are system-seeded exercises immutable from the trainer-scoped path? (Trainer can clone, never edit system rows.)
2. Is `name_ro` populated for the top ~150 exercises? (Complete localization is a post-launch chore but the MVP should feel Romanian-first.)
3. Does the storage policy block access to videos of archived exercises? (Yes, via `is_active` subquery.)
4. Is the substitution table bidirectional or unidirectional? (Unidirectional — a squat → leg press substitution does not imply the reverse. Document.)
5. Does the plan-limit check fire before storage upload? (Video uploads must not start if the trainer is over-limit.)

---

## Session 28 — Food Library & Nutrition Math

### Goal
Ship the nutrition content library — a hybrid system+trainer `foods` table seeded with a healthy slice of USDA FoodData Central (for US foods) plus Romanian staples — along with the math helpers (`TDEE`, `macros`) every subsequent nutrition feature depends on. Builder UI for trainers to add custom foods and recipes is included.

### Why this order
Meal plans (S32), recipes (S33), and the client food log (S33) all reference `foods` and its macro math. Doing this in isolation before the builder reduces churn.

### Context to Load

- `lib/db/schema/services.ts` (template for hybrid tenant+public).
- `lib/fit/units.ts` (from S26).
- PRD 5.4 (nutriție) in full; 4.3 (`foods`, `meal_items`).
- USDA FoodData Central API docs (free key at api.data.gov).

### Dependencies
- S26 (enums, units).

### External Services
- **USDA FoodData Central**: free API key. Used ONCE during seed; not at runtime.

### Data Model

**`foods`** (hybrid — `system` rows shared, `trainer` rows private):

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `owner_type` | text check in ('system','trainer') | |
| `professional_id` | uuid FK nullable | NULL iff system |
| `name` | text NOT NULL | |
| `name_ro` | text nullable | |
| `brand` | text nullable | |
| `serving_size_g` | numeric(8,2) NOT NULL | canonical serving in grams (or mL for liquids marked `is_liquid`) |
| `is_liquid` | boolean default false | treat `serving_size_g` as mL |
| `kcal_per_100g` | numeric(7,2) NOT NULL | |
| `protein_g_per_100g` | numeric(6,2) NOT NULL | |
| `carbs_g_per_100g` | numeric(6,2) NOT NULL | |
| `fat_g_per_100g` | numeric(6,2) NOT NULL | |
| `fiber_g_per_100g` | numeric(6,2) | |
| `sugar_g_per_100g` | numeric(6,2) | |
| `saturated_fat_g_per_100g` | numeric(6,2) | |
| `sodium_mg_per_100g` | numeric(8,2) | |
| `allergens` | text[] | `['gluten','dairy','nuts','eggs','soy','fish','shellfish']` |
| `dietary_flags` | text[] | `['vegan','vegetarian','keto','paleo','halal','kosher','low_fodmap']` |
| `category` | text | `protein | carb | fat | vegetable | fruit | dairy | beverage | sweet | condiment | supplement` |
| `source` | text | `usda | local | custom | recipe` |
| `external_id` | text nullable | USDA fdc_id or analogous |
| `is_active` | boolean default true | |
| `metadata` | jsonb default '{}' | |
| `created_at, updated_at` | | |

Indexes:
- `idx_foods_owner_professional` on `(owner_type, professional_id)`.
- Trigram on `name` + `name_ro`.
- `idx_foods_category_active` partial where `is_active=true`.

### Tasks (in order)

1. Create `lib/db/schema/foods.ts` + migration + `updated_at` trigger.
2. Create `lib/fit/tdee.ts`:
   - `mifflinStJeor({ weight_kg, height_cm, age, sex })`.
   - `harrisBenedict({ weight_kg, height_cm, age, sex })`.
   - `katchMcArdle({ weight_kg, body_fat_pct })`.
   - `applyActivityFactor(bmr, activity: 'sedentary'|'light'|'moderate'|'active'|'very_active')`.
   - Returns `{ bmr, tdee, activity_label }`.
3. Create `lib/fit/macros.ts`:
   - `macroSplit(kcal, split: { protein_pct, carbs_pct, fat_pct })` → `{ protein_g, carbs_g, fat_g }` (rounded to whole grams; guarantees 4/4/9 math).
   - `targetForClient(client, preset: 'balanced'|'cutting'|'bulking'|'keto'|'high_protein')` — presets that return `{ kcal_target, split }` based on TDEE and goal.
   - `adjustForTrainingDay(target, isTrainingDay)` — carb cycling helper (+15% carbs training, -15% rest).
4. Create `lib/fit/foods-search.ts`:
   - `searchFoods({ q, ownerType?, category?, allergens_excluded?, dietary_flags?, limit })`.
   - Uses trigram; returns paginated.
5. **Seed system foods** via `scripts/seed-foods.ts`:
   - Pull ~1500 foods from USDA FoodData Central focused on Foundation Foods + Branded Foods commonly eaten in RO.
   - Add ~300 Romanian staples not in USDA (mămăligă, sarmale, cozonac, ciorbă de burtă, salam, cașcaval, brânză de burduf, zacuscă, etc.) — curated manually with standard recipe analysis for per-100g macros.
   - Idempotent via `(source, external_id)` unique where source='usda'.
6. **Actions** in `lib/actions/fit/foods.ts`:
   - `createFood(input)` — trainer-scoped.
   - `updateFood(id, patch)`.
   - `archiveFood(id)`.
   - `cloneSystemFood(id)`.
7. **Queries** in `lib/db/queries/fit/foods.ts` — `listFoods`, `getFood`, trigram search.
8. **Routes** `app/dashboard/_niche/foods/` — list + create + edit; read-only view of system foods.
9. **Components** — `FoodGrid`, `FoodForm`, `MacroDonut` (reusable donut chart for per-food macro split), `AllergenChips`, `DietaryFlags`.
10. **i18n**, **PostHog**, **Sentry** — per conventions.
11. **Plan-limit**: `maxCustomFoods` in `lib/stripe/plans.ts` — Starter 50, Growth 500, Pro 5000.

### RLS Policies

```ts
pgPolicy("foods_system_select", {
  for: "select", to: [anonRole, authenticatedRole],
  using: sql`${t.ownerType} = 'system' and ${t.isActive} = true`,
}),
pgPolicy("foods_professional_all", {
  for: "all", to: authenticatedRole,
  using: sql`${t.ownerType} = 'trainer' and ${t.professionalId} = ${currentProfessionalIdSql}`,
  withCheck: sql`${t.ownerType} = 'trainer' and ${t.professionalId} = ${currentProfessionalIdSql}`,
}),
// Clients get indirect read via meal_items (S32); no direct policy on foods.
```

### Verification

- `SELECT count(*) FROM foods WHERE owner_type='system';` ≥ 1500.
- `mifflinStJeor({ weight_kg: 75, height_cm: 180, age: 30, sex: 'male' })` ≈ 1731 ± 5.
- `macroSplit(2400, { protein_pct: 30, carbs_pct: 40, fat_pct: 30 })` totals to 2400 ± 4 kcal.
- Trigram search returns "chicken breast" for query "chikn brest" (fuzzy tolerant).

### Self-check questions

1. Are USDA rows immutable from the tenant path? (System; trainers can clone, not edit.)
2. Does the seed script dedupe USDA `fdc_id` values on re-run? (Yes — `ON CONFLICT (source, external_id)`.)
3. Are allergen tags standardized against an enum list, or free-form? (Enum-like — enforced at action level via Zod, not at DB level to allow future additions.)
4. Is the Romanian locale seed substantial enough for an MVP demo? (300 staples covers typical meals — validate with a real nutritionist during QA.)
5. Are the TDEE formulas unit-tested against published reference values?

---

## Session 29 — Programs Schema (Programs, Phases, Workouts, Workout Exercises)

### Goal
Model the trainer's program structure end-to-end: a `program` is a named package (e.g., "12-Week Hypertrophy") containing ordered `program_phases` (weeks 1–4, 5–8, 9–12), each with ordered `workouts` (Mon/Wed/Fri A-B-A split), each with ordered `workout_exercises` that specify sets, reps, rest, tempo, RPE/RIR, notes. Also ships `program_templates` for reuse. No builder UI yet — strictly schema + core queries so the builder (S30) has a stable target.

### Why this order
Every downstream fitness feature writes to or reads from this hierarchy. Nailing the hierarchy now avoids migration churn later.

### Context to Load

- S26, S27 outputs (enums, muscle groups, equipment, `exercises`).
- `lib/db/schema/services.ts` — reference pattern for tenant tables.
- `lib/db/schema/forms.ts` — reference for a parent+children JSON-schema cluster (forms + form_assignments + form_responses).
- PRD 5.3.1 (program structure), 5.3.2 (advanced features).

### Dependencies
- S26, S27.

### Data Model

**`programs`**:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `professional_id` | uuid FK cascade | |
| `name` | text NOT NULL | |
| `slug` | text | unique per professional |
| `description` | text nullable | |
| `workout_type` | `workout_type_enum` | |
| `difficulty` | `difficulty_level_enum` | |
| `duration_weeks` | smallint NOT NULL | |
| `sessions_per_week` | smallint | planned default |
| `target_muscle_groups` | uuid[] | FK refs; informational |
| `equipment_required` | uuid[] | |
| `is_template` | boolean default false | program templates can be cloned into client assignments |
| `is_public_in_catalog` | boolean default false | future: marketplace — not S29 |
| `thumbnail_url` | text nullable | |
| `status` | text | `draft | active | archived` |
| `metadata` | jsonb default '{}' | |
| `created_at, updated_at` | | |

**`program_phases`**:
- `id`, `program_id` FK cascade, `name` text, `position` smallint, `weeks_start` smallint, `weeks_end` smallint, `description` text, `progression_rule` jsonb — `{ type: 'linear_weight', amount_kg: 2.5, frequency: 'weekly' }` or `{ type: 'linear_reps', amount_reps: 1 }` or `{ type: 'none' }`.

**`workouts`** (a single session template within a phase):
- `id`, `phase_id` FK cascade, `name`, `position`, `day_of_week` smallint nullable (0=Mon, 6=Sun; null for "any day"), `estimated_duration_min`, `workout_type` enum, `notes`.

**`workout_exercises`**:
- `id`, `workout_id` FK cascade, `exercise_id` FK → exercises, `position` smallint, `group_id` uuid nullable (superset/circuit grouping; null = standalone), `group_type` text nullable (`superset | circuit | giant_set | drop_set`).
- Set-level config (arrays aligned by index): `target_sets` smallint, `target_reps` text (e.g., `"8-12"` or `"AMRAP"` or `"5,5,5,3,3"`), `target_weight_pct_1rm` numeric nullable, `target_weight_kg` numeric nullable, `target_rpe` numeric(3,1) nullable, `target_rir` smallint nullable, `rest_seconds` smallint nullable, `tempo` text nullable.
- `notes` text — coach cues specific to this programming.
- `optional` boolean default false — mark accessory work as skippable.
- `substitution_preferred_id` uuid FK → exercises nullable — if the client can't do the primary, suggest this.
- `metadata` jsonb.

**`program_templates`** (tiny lookup; distinct from `programs.is_template=true` to support system-shared starter templates):
- `id`, `owner_type` (`system | trainer`), `professional_id` FK nullable, `program_id` FK — points to the underlying programs row that lives in is_template=true.
- RLS: system rows select-open; trainer rows scoped.

### Tasks (in order)

1. Create `lib/db/schema/programs.ts` with all four tables.
2. Add RLS policies (see below).
3. Generate migration; add `updated_at` triggers and a function `expand_program_to_client(programId, clientId, startDate)` — stub with signature; implementation in S31.
4. **Queries** in `lib/db/queries/fit/programs.ts`:
   - `listPrograms({ professionalId, search, workoutType, difficulty, status, page })`.
   - `getProgramFull(programId)` — program with phases, workouts, exercises (nested).
   - `countActivePrograms(professionalId)`.
5. **Domain types** in `types/fit/programs.ts`: `Program`, `ProgramPhase`, `Workout`, `WorkoutExercise`, `ProgramWithPhases`, `WorkoutWithExercises`.
6. **Seed 5 starter program templates** (as `system` owner rows via `program_templates`): Full-Body 3x/week Beginner; Push/Pull/Legs 6-day Intermediate; Upper/Lower 4x/week Hypertrophy; 5x5 Strength 12 weeks; Postpartum Recovery 12 weeks. Each phase + workout + exercise linked to seeded system exercises.
7. **Plan gating** — register `maxProgramsPerClient` in `lib/stripe/plans.ts`: Starter 1, Growth 3, Pro unlimited. (Enforced in S31 where assignment happens.)
8. **i18n** — keys stubbed; real UI copy lands in S30.
9. Regenerate `types/database.ts`.

### RLS Policies

```ts
// programs
pgPolicy("programs_professional_all", {
  for: "all", to: authenticatedRole,
  using: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
  withCheck: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
}),
pgPolicy("programs_client_select", {
  for: "select", to: authenticatedRole,
  using: sql`
    exists (
      select 1 from client_programs cp
      where cp.program_id = ${t.id}
        and cp.client_id = ${currentClientIdSql}
        and cp.status in ('active','completed')
    )
  `,
}),
// program_phases, workouts, workout_exercises — inherit via parent program
// e.g., on workouts:
pgPolicy("workouts_client_select", {
  for: "select", to: authenticatedRole,
  using: sql`
    exists (
      select 1 from program_phases ph
      join client_programs cp on cp.program_id = ph.program_id
      where ph.id = ${t.phaseId}
        and cp.client_id = ${currentClientIdSql}
        and cp.status in ('active','completed')
    )
  `,
}),
```

### Verification

- `INSERT INTO programs (...)` as trainer A; SELECT as trainer B returns 0 rows.
- Inserting a workout_exercise referencing an exercise not owned by the trainer and not `owner_type='system'` fails — enforce via a BEFORE INSERT trigger (or constraint via join-check at action layer).
- Seed runs cleanly.
- `getProgramFull(id)` returns nested structure with all children ordered by `position`.

### Self-check questions

1. Does the cascade chain (program → phases → workouts → exercises) correctly delete children on program delete?
2. Are `target_reps` strings validated to a grammar (`"N"`, `"N-M"`, `"AMRAP"`, `"5,5,5,3"`) at the action layer? (Yes; define in `lib/fit/program-builder-validate.ts` and reuse in S30.)
3. Is `day_of_week` nullable intentionally? (Yes — trainers sometimes design "do 3 per week, any day" programs; S31 materialization picks concrete days.)
4. Does `group_id` correctly model supersets (A1 + A2 share `group_id`)? Add a unique constraint `(workout_id, group_id, position)` to guarantee positional order within a group.
5. Is `program_templates` genuinely necessary, or is `programs.is_template=true` enough? Keep `program_templates` only for system-seeded rows that don't belong to a specific professional; skip if dropping complexity.

---

## Session 30 — Program Builder Dashboard UI

### Goal
The trainer's flagship creation UX: a drag-drop, multi-step, autosaving program builder that composes phases, workouts, and exercises with full control over sets, reps, rest, tempo, RPE/RIR, supersets, and progressive overload rules. Includes a template library (clone from system or trainer templates) and duplicate-program action.

### Why this order
Schema (S29) is live; the trainer now needs a way to create programs before S31 can assign them. This is the hardest trainer-facing UI in the product — give it its own session.

### Context to Load

- S27 (exercises) for picker.
- S29 schema files.
- `components/dashboard/forms/` — drag-drop patterns built on `@dnd-kit`.
- `components/dashboard/leads/kanban-board.tsx` — drag-drop reference.
- `hooks/use-subscription.ts` — plan gating.
- PRD 5.3.1 + 5.3.2.

### Dependencies
- S27, S29.

### External Services
None.

### Tasks

1. **Actions** in `lib/actions/fit/programs.ts`:
   - `createProgram(input)` — basic name/duration/type; returns id for wizard continuation.
   - `updateProgramMetadata(id, patch)`.
   - `addPhase(programId, { name, weeksStart, weeksEnd, progressionRule })`.
   - `removePhase(phaseId)` — cascades.
   - `reorderPhases(programId, orderedIds)`.
   - `addWorkout(phaseId, { name, dayOfWeek, type })`.
   - `duplicateWorkout(workoutId)` / `removeWorkout(workoutId)` / `reorderWorkouts(phaseId, orderedIds)`.
   - `addWorkoutExercise(workoutId, { exerciseId, position, groupId?, groupType? })` — returns row for immediate editing.
   - `updateWorkoutExercise(id, patch)` — all set-level fields.
   - `reorderWorkoutExercises(workoutId, orderedIds)`.
   - `groupIntoSuperset(workoutId, exerciseIds[])` — assigns `group_id` UUID, `group_type='superset'`.
   - `ungroupFromSuperset(groupId)`.
   - `publishProgram(id)` — status → `active`.
   - `archiveProgram(id)`.
   - `duplicateProgram(sourceId, { newName })` — deep copy.
   - `cloneFromTemplate(templateId, { newName })` — creates a fresh program from a system template.
2. **Server-side validation** — `lib/fit/program-builder-validate.ts`:
   - Parse reps grammar.
   - Ensure at least one exercise per workout on publish.
   - Ensure phase week ranges don't overlap and cover 1..duration_weeks contiguously.
3. **Routes** `app/dashboard/_niche/programs/`:
   - `page.tsx` — list with filters + templates tab.
   - `new/page.tsx` — wizard step 1 (name, type, duration, difficulty).
   - `[id]/page.tsx` — full builder:
     - Left: phase navigator (collapsible; drag to reorder).
     - Center: selected phase's workouts as vertical cards; each workout expandable into a sortable exercise list.
     - Right: exercise picker palette (S27 list with filter chips) — drag to drop into workout.
     - Per-exercise row: inline edit of sets/reps/rest/tempo/RPE/RIR, superset toggle, notes.
   - `[id]/preview/page.tsx` — read-only rendering simulating the client view.
   - `templates/page.tsx` — library view (system + trainer templates); "Use as starter" button.
4. **Components** `components/dashboard/fit/programs/`:
   - `ProgramList.tsx`, `ProgramCard.tsx`, `ProgramWizard.tsx` (multi-step).
   - `ProgramBuilderShell.tsx` — the main three-pane layout.
   - `PhaseNavigator.tsx` — dnd-sortable sidebar.
   - `WorkoutCard.tsx` — collapsible with exercise list.
   - `ExerciseRow.tsx` — inline editable row; RPE picker; rest timer preview.
   - `ExercisePicker.tsx` — palette with drag source; reuses S27 list queries.
   - `SupersetGroup.tsx` — visual grouping with colored border.
   - `ProgressionRuleEditor.tsx` — per-phase rule selector.
   - `ProgramPreview.tsx` — client-eye preview.
   - `ProgramDuplicateDialog.tsx`.
5. **Autosave** — every change commits immediately via server action with optimistic UI. Debounce only on text fields (300ms). No "Save" button required except at publish.
6. **Keyboard shortcuts**: `/` focuses exercise search; `↑/↓` navigates rows; `Tab` commits set edits; `Cmd/Ctrl+D` duplicates selected exercise.
7. **Mobile** — the builder is usable on tablet (768px+); on phone show a read-only view with a CTA to edit on larger screen.
8. **i18n** — `fit.programs.*` keys in both locales.
9. **PostHog** — `fit.program.created`, `fit.program.published`, `fit.program.duplicated`, `fit.program.templated_from`.
10. **Nav** — add `programs` to NICHE_NAV (icon `ClipboardList`).

### Verification

- Create a 12-week hypertrophy program with 3 phases, 3 workouts per phase, 8 exercises per workout — all via wizard + builder without page reload. Total should complete in < 10 min for a practiced trainer.
- Drag an exercise into a workout; reorder it; group two into a superset; ungroup; delete.
- Attempt to publish a program with an empty workout — blocked with clear error.
- Duplicate program — deep copy preserves all structure.

### Self-check questions

1. Is the wizard safe against tab close mid-build? (Autosave every action; wizard state stored server-side, not in memory.)
2. Does the exercise picker filter out `is_active=false` exercises?
3. Are drag-and-drop errors (e.g., failed reorder server action) gracefully reverted in UI?
4. Is the "publish" action gated by server-side validation (incompleteness check) — not just client-side?
5. Does duplication reset `created_at` on all children, but keep `metadata` intact? (Yes.)

---

## Session 31 — Program Assignment to Clients

### Goal
Turn a program template into a concrete, scheduled plan for a specific client: choose start date, map `day_of_week` placeholders to the client's week, materialize every workout into `client_workouts` rows with concrete dates, and surface the weekly view in both the trainer's client profile and (S37) the client portal. Handle reassignment, pause/resume, and completion.

### Why this order
Programs alone are abstract. Assignment is what makes the product useful for the client. S32+ nutrition and S34+ progress tracking will pivot off assignments.

### Context to Load
- S29, S30 outputs.
- `lib/db/schema/professional_clients.ts` (junction semantics).
- `lib/notifications/send.ts` (to notify client on assignment).
- `trigger/jobs/appointments.ts` (reminder pattern) — model materialization after.
- PRD 5.2.2 (client profile tabs), 5.3.1 (programs).

### Dependencies
- S29, S30.

### Data Model

**`client_programs`**:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `professional_id` | uuid FK | |
| `client_id` | uuid FK | |
| `program_id` | uuid FK → programs (`is_template` may be false; stable live program) | |
| `status` | text | `active | paused | completed | cancelled` |
| `start_date` | date NOT NULL | |
| `end_date_expected` | date | computed from program duration |
| `end_date_actual` | date nullable | |
| `current_phase_id` | uuid nullable | tracks progression through phases |
| `current_week_in_phase` | smallint | |
| `week_start_day` | smallint default 1 | 0=Sun, 1=Mon — respects client culture |
| `override_day_map` | jsonb | optional per-workout day override `{ workoutId: dayOfWeek }` |
| `completion_percent` | numeric(5,2) | computed from client_workouts |
| `notes` | text | trainer's notes for this assignment |
| `paused_at, resumed_at` | timestamptz[] | history of pauses (as jsonb array) |
| `created_at, updated_at` | | |

**`client_workouts`** (materialized instance — ONE row per scheduled session):

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `client_program_id` | uuid FK cascade | |
| `workout_id` | uuid FK → workouts | reference to template |
| `professional_id, client_id` | | denormalized for RLS speed |
| `scheduled_date` | date NOT NULL | |
| `scheduled_day_of_week` | smallint | |
| `status` | text | `scheduled | in_progress | completed | skipped | missed` |
| `started_at, completed_at` | timestamptz nullable | |
| `duration_minutes` | integer nullable | |
| `rating` | smallint nullable | 1..5 |
| `rpe_session` | numeric(3,1) nullable | client self-report post-session |
| `notes` | text nullable | client notes |
| `metadata` | jsonb | |
| `created_at, updated_at` | | |

### Tasks

1. Schema + migration + triggers.
2. **Materialization engine** — `lib/fit/workout-materializer.ts`:
   - `materializeClientProgram(clientProgramId, tx)` — walks phases → workouts; for each workout with a `day_of_week`, computes the concrete date by walking weeks from `start_date`; for null-day workouts, evenly distribute across `sessions_per_week` placeholder; respects `override_day_map`.
   - Idempotent: uses a natural key `(client_program_id, workout_id, week_index)` to avoid double-insert on re-run.
   - Emits a summary `{ created: n, skipped: n }`.
3. **Actions** in `lib/actions/fit/client-programs.ts`:
   - `assignProgramToClient({ clientId, programId, startDate, overrideDayMap? })` — plan-limit check (`max_programs_per_client` across `status='active'`); calls materializer; triggers notification + automation `program_assigned`.
   - `pauseClientProgram(id, reason)` — status=`paused`; marks future `client_workouts` as `skipped` optionally.
   - `resumeClientProgram(id, { shiftDays? })` — optionally reschedule subsequent workouts forward.
   - `completeClientProgram(id)` — status=`completed`; sets `end_date_actual`; triggers automation `program_completed`.
   - `cancelClientProgram(id, reason)`.
   - `reassignWorkoutDate(clientWorkoutId, newDate)` — single-session reschedule.
   - `skipWorkout(clientWorkoutId, reason)`.
4. **Queries** in `lib/db/queries/fit/client-programs.ts`:
   - `getActiveProgramForClient(clientId)`.
   - `getWeekWorkouts(clientId, weekStart)` — returns 7-day view.
   - `getTodaysWorkout(clientId, date)` — the single session for today if any.
   - `getProgramHistory(clientId)`.
5. **Trigger.dev job** `trigger/jobs/fit/materialize-weekly-workouts.ts`:
   - Weekly Sunday 23:00 local: re-check active programs, ensure next 4 weeks are materialized; fix drift if a previous week was wrongly skipped.
6. **Dashboard UI** — extend `app/dashboard/clients/[id]/` with a new `_niche/fit/programs` tab:
   - List of client_programs (active + history).
   - "Assign Program" CTA → modal with program picker + start-date + day-map override.
   - Weekly calendar preview (Mon–Sun) per assigned program.
   - Pause/Resume/Complete buttons.
7. **Client-profile "Today" card** on professional side — shows today's assigned workout per client for quick coaching glance.
8. **Notifications** — on assignment: client receives email + in-app notification with branded email template `fit-program-assigned.tsx`.
9. **Automation triggers** (register in engine): `program_assigned`, `program_completed`, `workout_missed` (client_workouts older than today, still `scheduled`).
10. **i18n**, **PostHog**, **Sentry** — per conventions.

### RLS Policies

```ts
// client_programs
pgPolicy("client_programs_professional_all", { ... using professionalId = currentProfessionalIdSql ... }),
pgPolicy("client_programs_client_select", {
  for: "select", to: authenticatedRole,
  using: sql`${t.clientId} = ${currentClientIdSql}`,
}),
// client_workouts — same pattern
```

### Verification

- Assign a 12-week program starting next Monday; `client_workouts` rows equal total workouts = phases × workouts per phase × weeks per phase.
- Pause mid-week; future workouts still exist but status=`skipped`; resume shifts dates forward by pause duration.
- Reassign today's workout to tomorrow — row updates, no duplicates.
- Plan-limit blocks 2nd active program on Starter.

### Self-check questions

1. Is materialization run inside a transaction? (Must be — otherwise a partial run leaves inconsistent state.)
2. Does pausing gracefully handle workouts already completed in the current week?
3. Are `client_workouts` rows for future weeks created lazily or upfront? (Upfront for simplicity; weekly cron repairs drift.)
4. Is timezone respected? `scheduled_date` is a `date`, not a `timestamptz`; interpret in `client.locale` timezone at display time. (Trainer's timezone wins on ambiguity — document.)
5. Does deleting a program cascade to all client_programs and client_workouts? (Yes via FK. Big blast radius — lock program deletion behind a confirm dialog in S30.)

---

## Session 32 — Nutrition Builder (Meal Plans)

### Goal
Give the trainer a parallel-to-programs UX for nutrition: build `meal_plans` with a daily cadence of `meals`, each populated with `meal_items` drawn from the foods library (S28). Macro totals roll up live. Support "training day" vs "rest day" variants. Assignable to clients similarly to programs.

### Why this order
Nutrition is the second pillar of the product (per PRD §5.4). With foods in place (S28) and the assignment pattern proven (S31), this session is mostly structure + UI.

### Context to Load
- S28 (foods, TDEE, macro helpers).
- S29–S31 (assignment model to mirror).
- PRD 5.4 in full.

### Dependencies
- S28, S31.

### Data Model

**`meal_plans`**:
- `id`, `professional_id` FK cascade.
- `name`, `description`.
- `duration_weeks` smallint — typically shorter than programs (2, 4, 8, 12).
- `has_variants` boolean default false — if true, meals exist in two flavors (training / rest).
- `kcal_target_default` numeric(6,1) nullable, `protein_target_default_g, carbs_target_default_g, fat_target_default_g`.
- `dietary_flags` text[] (`vegan|keto|paleo|...`).
- `status` text — `draft | active | archived`.
- `is_template` boolean.
- `metadata` jsonb.
- timestamps.

**`meals`**:
- `id`, `meal_plan_id` FK cascade.
- `day_of_week` smallint nullable (or "applies to any day" via null).
- `variant` text — `default | training | rest` (training/rest only when `has_variants=true`).
- `meal_type` `meal_type_enum`.
- `name` text (e.g., "Mic dejun — ovăz cu fructe").
- `time_hint` text nullable ("07:30").
- `instructions` text nullable (short prep note; rich recipes use S33 recipes).
- `position` smallint.
- `metadata` jsonb.

**`meal_items`**:
- `id`, `meal_id` FK cascade.
- `food_id` FK → foods OR `recipe_id` FK → recipes (S33) — exactly one non-null.
- `quantity_g` numeric(8,2) — canonical grams (liquids use mL via foods.is_liquid).
- `position` smallint.
- Computed columns (GENERATED ALWAYS): `kcal`, `protein_g`, `carbs_g`, `fat_g` based on food's per-100g × quantity.
- `notes` text nullable.

### Tasks

1. Schema + migration + triggers. Add a BEFORE INSERT/UPDATE trigger that enforces exactly-one of `food_id` or `recipe_id`.
2. **Actions** in `lib/actions/fit/meal-plans.ts`: CRUD for plan / meal / meal_item; reorder; duplicate-plan; variant flip.
3. **Queries** in `lib/db/queries/fit/meal-plans.ts`:
   - `listMealPlans({ professionalId, ... })`.
   - `getMealPlanFull(id)` — plan + meals + items (with food macros resolved).
   - `macroRollupForDay(mealPlanId, dayOfWeek, variant)` — `{ kcal, protein_g, carbs_g, fat_g }`.
4. **Routes** `app/dashboard/_niche/nutrition/meal-plans/`:
   - List, new-wizard, `[id]/page.tsx` builder.
5. **Builder UI** — left: day-of-week tabs (Mon–Sun + variant switch); center: meals of the day with foods; right: foods palette with search + recent foods + common foods + favorites.
6. **Live macro rollup** — a sticky footer showing current day's kcal/P/C/F vs the plan's daily targets; color-coded (green within ±5%, amber within ±10%, red outside).
7. **Assignment to client** — mirrors S31: `client_meal_plans` + `client_meal_days` (similar materialization). Simpler because macros are per-day, not per-session.
8. **Email notification** on assignment using `fit-meal-plan-assigned.tsx`.
9. **Plan-limit** — register `maxActiveMealPlansPerClient` (Starter 1, Growth 3, Pro unlimited).
10. **i18n, PostHog, Sentry** — per conventions.

### RLS
- Standard pattern: trainer manages own; client reads own assignments via `client_meal_plans`.

### Verification

- Create a 4-week plan with 7 days × 5 meals × 3 items per meal; macro rollup matches hand-calculation within ±1 g.
- Switch variant training → rest; different foods render without reload.
- Assign to client; client sees in portal (placeholder — real UI in S37).

### Self-check questions

1. Are generated macro columns correct across food servings (per-100g × quantity / 100)?
2. Does the trigger preventing both `food_id` and `recipe_id` fire on UPDATE, not just INSERT?
3. Does duplicating a plan also duplicate variant rows correctly?
4. Is the per-day macro rollup query indexed? (Add `idx_meal_items_meal_id`.)
5. Is there a "copy day" shortcut? (Essential UX — a trainer replicating the same lunch 5 days is common.)

---

## Session 33 — Recipes, Shopping List, and Client Food Log

### Goal
Three closely related additions: (1) `recipes` (trainer-authored composite foods with instructions and photo), (2) shopping-list generator that aggregates a week of assigned meal items into an aisle-grouped checklist, (3) client-side food log where the client records what they actually ate (search foods, portion entry, photo upload, macro compliance).

### Why this order
Recipes extend meal plans (referenced from S32 via `meal_items.recipe_id`). Shopping lists are a derived artifact that clients expect from day one. The food log closes the measurement loop for the nutrition pillar.

### Context to Load
- S28, S32 outputs.
- PRD 5.4 + 6.3.

### Dependencies
- S32.

### Data Model

**`recipes`**:
- `id`, `professional_id` FK cascade.
- `name`, `description`, `instructions` jsonb (ordered steps).
- `servings` smallint default 1.
- `prep_time_min`, `cook_time_min`.
- `photo_url` text nullable.
- `tags` text[] — `quick | batch_cook | post_workout | low_carb | ...`.
- `dietary_flags` text[].
- `allergens` text[].
- `is_active` boolean.
- timestamps.

**`recipe_ingredients`**:
- `id`, `recipe_id` FK cascade.
- `food_id` FK → foods.
- `quantity_g` numeric(8,2).
- `position` smallint.
- Computed: `kcal_per_serving`, `protein_g_per_serving`, etc. (sum of ingredients / servings).

**`client_food_log_entries`**:
- `id`, `client_id` FK, `professional_id` FK (denormalized).
- `logged_at` timestamptz.
- `meal_type` meal_type_enum.
- `food_id` FK nullable or `recipe_id` FK nullable — exactly one non-null (same constraint pattern as `meal_items`).
- `quantity_g` numeric(8,2).
- Computed macros columns.
- `photo_url` text nullable — meal photo for trainer review.
- `source` text — `manual | quick_add | barcode | wearable_import | meal_plan_check_in`.
- `notes` text nullable.
- `metadata` jsonb.

**`water_intake_entries`**:
- `id`, `client_id` FK, `logged_at`, `amount_ml` integer.
- Lightweight; aggregated daily.

### Tasks

1. Schema + migration + triggers. Add `exactly-one-of-food_recipe` trigger on `meal_items` and `client_food_log_entries`.
2. **Recipe actions** (`lib/actions/fit/recipes.ts`): CRUD + upload photo (Supabase Storage `media/recipes/<professional_id>/<recipe_id>/`).
3. **Recipe routes** `app/dashboard/_niche/nutrition/recipes/`: list, new, edit.
4. **Shopping list** — `lib/fit/shopping-list.ts`:
   - `generateShoppingList(clientMealPlanId, { startDate, endDate })` → aggregates `meal_items` across date range; groups by `foods.category` (protein / carb / fat / vegetable / dairy / …); computes total grams; converts to reasonable purchase units (100g → "100 g"; 2500g of chicken → "2.5 kg"; 3000 mL of milk → "3 L"); checks allergens.
   - `exportShoppingListPDF(listId)` — simple React-PDF document.
5. **Shopping list UI** — `app/portal/_niche/nutrition/shopping-list/page.tsx` (client-side) + `app/dashboard/_niche/clients/[id]/fit/shopping-list/page.tsx` (trainer view):
   - Checkable items (persisted in `client_shopping_checks` small table).
   - Group toggle.
   - Export PDF.
6. **Client food log** — actions `logFoodEntry`, `updateFoodEntry`, `deleteFoodEntry`, `logWaterIntake` in `lib/actions/fit/food-logs.ts`.
7. **Food log UI** — `app/portal/_niche/nutrition/food-log/page.tsx`:
   - Day selector (today + past 14 days).
   - Meal-type sections with add buttons.
   - Food search (reuses S28 trigram).
   - "Use meal plan meal" shortcut — one-click logs what the plan said to eat.
   - Macro progress donut (consumed vs target from assigned meal plan).
   - Meal photo upload.
   - Water tracker with +250 mL quick buttons.
8. **Trainer review UI** on client profile: `_niche/fit/food-log` tab — scrollable diary; ability to comment on individual entries; macro adherence line chart over trailing 30 days.
9. **Notifications** — if compliance < 50% for 3 days running, notify trainer.
10. **PostHog** — `fit.food.logged`, `fit.food.photo_uploaded`, `fit.water.logged`, `fit.shopping_list.generated`.

### RLS
- Recipes: trainer CRUD; client SELECT via active meal_plan join.
- Food log: trainer reads via `professional_clients`; client self; strict RLS.
- Shopping list: same.

### Verification

- Build a recipe referencing 5 foods; macro-per-serving math matches hand-calc.
- Assign a meal plan that includes a recipe; shopping list correctly aggregates recipe ingredients × servings used across days.
- Client logs a food entry; macros roll up into daily chart.
- Allergic warning: if client has `gluten` in `metadata.allergens`, shopping list flags items containing gluten.

### Self-check questions

1. Does the recipe-ingredient rollup avoid double-counting when a recipe references another recipe? (Disallow recursion — simpler than handling it.)
2. Is the `client_food_log_entries.source = 'meal_plan_check_in'` path idempotent for a day (can't log the same plan meal twice)?
3. Does the water tracker aggregate correctly across multiple entries?
4. Is the shopping list grouping localized (Romanian aisle names)?
5. Does the meal photo upload respect the storage plan limit?

---

## Session 34 — Measurements & Wellness Logs

### Goal
The client's numeric proof track: body measurements (weight, circumferences, body-fat percent, BMI computed), wellness logs (sleep, energy, stress, mood, note), optional reminders. Trainer sees charts and trend lines. Data is the foundation for every client progress conversation.

### Why this order
Progress photos (S35) and workout tracker (S36) extend the proof model. Measurements are the simplest place to start, and they're the #1 client expectation per the PRD persona "Ioana" (§3.4).

### Context to Load
- PRD 6.4 in full.
- `lib/fit/units.ts`.
- Nucleus form templates (for check-in form reuse).

### Dependencies
- S26 (units), S31 (client assignments provide context for measurement cadence).

### Data Model

**`progress_entries`**:
- `id`, `client_id` FK cascade, `professional_id` FK (denormalized).
- `recorded_at` timestamptz.
- `weight_kg` numeric(6,2) nullable.
- `body_fat_pct` numeric(5,2) nullable — from caliper / InBody / DEXA.
- `muscle_mass_kg` numeric(6,2) nullable.
- `water_pct` numeric(5,2) nullable.
- `visceral_fat_rating` smallint nullable.
- `resting_heart_rate` smallint nullable.
- `bmi` numeric(5,2) GENERATED ALWAYS AS (...) — requires client height. Actually compute at query time since height may change; keep as nullable static.
- `source` text — `manual | scale_sync | bodpod | dexa | inbody | other`.
- `notes` text.
- `metadata` jsonb (for scale-specific fields).

**`body_measurements`**:
- `id`, `progress_entry_id` FK cascade (optional — can also be standalone if client only logs girths without weight).
- `client_id`, `professional_id` (denormalized).
- `recorded_at`.
- `waist_cm`, `hip_cm`, `chest_cm`, `neck_cm`, `arm_left_cm`, `arm_right_cm`, `thigh_left_cm`, `thigh_right_cm`, `calf_left_cm`, `calf_right_cm`, `shoulder_cm` — all numeric(5,2) nullable.
- Computed: `waist_hip_ratio`.
- `notes`.

**`wellness_logs`**:
- `id`, `client_id`, `professional_id` denormalized.
- `logged_at` date (one entry per day max; unique `(client_id, logged_at)`).
- `sleep_hours` numeric(3,1) nullable.
- `sleep_quality` smallint nullable (1..5).
- `energy` smallint nullable (1..10).
- `stress` smallint nullable (1..10).
- `mood` text nullable — enum `very_good | good | neutral | bad | very_bad` OR emoji selector serialized to that enum.
- `menstrual_cycle_day` smallint nullable.
- `note` text nullable.
- `metadata` jsonb.

### Tasks

1. Schema + migration + triggers + indexes `(client_id, recorded_at desc)`.
2. **Client height** — store `clients.metadata.height_cm` (set during onboarding S39) with a helper `getClientHeight(client)`.
3. **Actions** in `lib/actions/fit/progress.ts`:
   - `logProgressEntry(clientId, input)` — permits client self-log or trainer logging on behalf (via `acting_as`).
   - `updateProgressEntry(id, patch)` / `deleteProgressEntry(id)`.
   - `logBodyMeasurements(clientId, input)` — separate from weight (sometimes client measures weekly, weighs daily).
   - `logWellness(clientId, input)` — idempotent on (client_id, date).
4. **Queries**:
   - `listProgressEntries(clientId, { from, to })`.
   - `latestProgressEntry(clientId)`.
   - `measurementSeries(clientId, metric, { from, to })` — for charts; returns `[{date, value}]`.
   - `wellnessAverages(clientId, period)` — for dashboards.
5. **Routes**:
   - `app/portal/_niche/progress/measurements/page.tsx` — client logs new entry; sees trend charts for weight, body-fat, circumferences.
   - `app/portal/_niche/progress/wellness/page.tsx` — daily wellness form + 30-day heatmap.
   - `app/dashboard/_niche/clients/[id]/fit/measurements/page.tsx` — trainer view of full history; can log on behalf.
6. **Components** in `components/portal/fit/progress/`:
   - `WeightEntryForm.tsx`, `GirthForm.tsx`, `WellnessDailyForm.tsx`.
   - `TrendChart.tsx` (Recharts line with dots + 7-day moving average overlay).
   - `ProgressComparisonCard.tsx` — "vs 30 days ago" / "vs start" deltas.
   - `WellnessHeatmap.tsx` — 30-day colored grid by mood.
7. **Reminder** — weekly check-in reminder Trigger.dev job `trigger/jobs/fit/check-in-reminder.ts` (Sunday 19:00 local per client timezone).
8. **Export** — PDF export of measurements timeline for client record-keeping.
9. **Automation triggers** — `measurement_logged`, `wellness_streak_broken` (3 missed days), `weight_goal_reached` (computed from goals on client profile).
10. **i18n, PostHog, Sentry** per conventions.

### RLS
- Professional reads all via `professional_clients` join.
- Client reads/writes own.
- No public exposure.

### Verification

- Client logs weight 3 days in a row; trend chart updates; moving-average computed.
- Trainer logs an InBody entry on behalf of client; source=`inbody`.
- Wellness daily idempotent — editing doesn't create duplicate rows.

### Self-check questions

1. Is BMI computed fresh at display time (from current height + current weight), not frozen in the row? (Yes — heights shift rarely but can.)
2. Are units converted on display per `locale_units` helper? (Yes — DB always metric.)
3. Does the wellness heatmap handle missing days gracefully (not just missing data)?
4. Does the PDF export respect RLS (client exports own; trainer exports any linked client)?
5. Is the measurement form auto-saving partial values? (Yes — clients get distracted; never lose data.)

---

## Session 35 — Progress Photos

### Goal
The emotional centerpiece. Progress photos let clients capture before/after visual evidence of change. Must be stored in a privacy-sensitive way (client-owned data, not casually public), offer a flattering comparator UI with slider, and respect explicit consent before any photo is shown in a marketing transformation gallery.

### Why this order
Photos follow measurements in the proof model. The storage privacy considerations warrant a dedicated session — this is not a place to shortcut.

### Context to Load
- PRD 6.4.2 in full.
- `supabase/migrations/9900_storage_buckets.sql`.
- `lib/supabase/server.ts` + `admin.ts` (signed URLs).
- EstateCore S27 storage policy pattern for parent-active gating.

### Dependencies
- S34.

### External Services
None new (reuses Supabase Storage).

### Data Model

**`progress_photos`**:
- `id`, `client_id` FK cascade, `professional_id` FK (denormalized).
- `progress_entry_id` FK → progress_entries nullable (link to a weigh-in snapshot).
- `taken_at` timestamptz.
- `storage_key` text — e.g., `progress-photos/<professional_id>/<client_id>/<uuid>.jpg`.
- `thumbnail_storage_key` text.
- `pose` text — `front | side_left | side_right | back | freeform`.
- `body_weight_kg_snapshot` numeric(6,2) nullable — copy at capture time (so the photo always references context).
- `notes` text.
- `visibility` text NOT NULL default `private` — `private | trainer_only | used_in_transformations_with_consent`.
- `consent_for_marketing` boolean default false — toggles S40 transformation-gallery eligibility.
- `consent_signed_at` timestamptz nullable, `consent_document_url` text nullable — optional signed consent form.
- `watermark_applied` boolean default false.
- `metadata` jsonb — EXIF-scrubbed camera/device info if available.
- timestamps.

**Storage bucket**: dedicated bucket `progress-photos` (NEW — not on `media`). Private by default (no public listing). All reads happen via signed URLs created at server action time.

### Tasks

1. **Storage bucket** — hand-written migration `supabase/migrations/YYYYMMDDHHMMSS_session35_progress_photos_bucket.sql`:
   ```sql
   insert into storage.buckets (id, name, public) values ('progress-photos', 'progress-photos', false);
   ```
2. **Storage policies** — no direct SELECT; all access mediated by signed URLs from server actions. Policies restrict INSERT/UPDATE/DELETE to authenticated users owning the folder path.
3. **Schema + migration** for `progress_photos` table. Index `(client_id, taken_at desc)`.
4. **Pipeline** — `lib/fit/progress-photo-pipeline.ts`:
   - `uploadProgressPhoto(clientId, file, opts)` server action:
     1. Validate MIME (jpeg/png/heic).
     2. Resize to max 2048×2048 via `sharp` (preserving aspect).
     3. Strip EXIF GPS (privacy).
     4. Optionally watermark with faint "ClientName • Date" overlay (configurable per trainer).
     5. Generate thumbnail 400×400.
     6. Upload both to `progress-photos/<professional_id>/<client_id>/<uuid>.jpg`.
     7. Insert row.
   - `signedPhotoUrl(photoId, expiresIn=1800)` — returns a 30-min signed URL.
5. **Consent workflow** — `lib/fit/photo-privacy.ts`:
   - `grantMarketingConsent(photoId, { signatureDataUrl? })` — flips `consent_for_marketing=true`; optionally stores an embedded signature or generated consent PDF in `documents` bucket.
   - `revokeMarketingConsent(photoId)` — sets back to `trainer_only`; removes from transformation gallery cache.
6. **Actions** in `lib/actions/fit/progress-photos.ts`:
   - `uploadPhoto`, `deletePhoto`, `updatePose`, `linkToProgressEntry`, `grantMarketingConsent`, `revokeMarketingConsent`, `downloadOriginal` (generates signed URL; records an audit row).
7. **Queries**:
   - `listPhotos(clientId, { pose?, from?, to? })`.
   - `pickPairForComparator(clientId, { pose, earlierDate, laterDate })` — the two closest matches.
8. **Routes**:
   - `app/portal/_niche/progress/photos/page.tsx` — client gallery (grid by month); pose filter; comparison launcher.
   - `app/portal/_niche/progress/photos/compare/page.tsx` — slider comparator `<BeforeAfterSlider />`.
   - `app/dashboard/_niche/clients/[id]/fit/photos/page.tsx` — trainer view identical to client's; cannot download originals without client consent (audit logged).
9. **Components** in `components/portal/fit/progress/`:
   - `PhotoUploadSheet.tsx` — mobile-friendly camera capture or file select; pose selector; upload progress.
   - `PhotoGalleryGrid.tsx`.
   - `BeforeAfterSlider.tsx` (CSS-based; no external dep needed).
   - `ConsentDialog.tsx` — rich text consent + checkbox + e-signature; generates PDF summarizing consent; stores under `documents`.
10. **Plan limit** — `max_progress_photo_storage_mb` per plan: Starter 200, Growth 2000, Pro 10000. Enforce during upload: sum bytes for client's professional; reject if over.
11. **Automation hooks** — `photo_uploaded` trigger (badges: "First photo", "30-day transformation", etc.).
12. **i18n, PostHog events** — `fit.photo.uploaded`, `fit.photo.marketing_consent_granted`, `fit.photo.compared`.

### RLS Policies

```ts
pgPolicy("progress_photos_professional_select", {
  for: "select", to: authenticatedRole,
  using: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
}),
pgPolicy("progress_photos_client_all", {
  for: "all", to: authenticatedRole,
  using: sql`${t.clientId} = ${currentClientIdSql}`,
  withCheck: sql`${t.clientId} = ${currentClientIdSql}`,
}),
pgPolicy("progress_photos_professional_write_on_behalf", {
  // trainers can insert on behalf of linked clients but cannot modify without client action afterward
  for: "insert", to: authenticatedRole,
  withCheck: sql`
    ${t.professionalId} = ${currentProfessionalIdSql}
    and exists (select 1 from professional_clients pc
                where pc.professional_id = ${t.professionalId}
                  and pc.client_id = ${t.clientId}
                  and pc.status = 'active')
  `,
}),
```

### Verification

- Client uploads a photo via phone camera; thumbnail + full-size both stored; row inserted.
- Signed URL works for 30 min, fails after.
- Trainer attempts to download original without consent → blocked + audit row created.
- Storage quota at 99% → next upload blocked with friendly error.
- Revoke consent → photo disappears from S40 transformation gallery within revalidation window.
- GDPR delete-client → all photos purged from storage within the delete transaction.

### Self-check questions

1. Is EXIF GPS scrubbed before upload? (GPS can leak home address — non-negotiable.)
2. Does the comparator slider work on mobile Safari (touch events)?
3. Is the consent audit trail immutable (no UPDATE on `consent_signed_at` once set)?
4. Does the storage policy handle folder paths correctly with Clerk JWT (`storage.foldername(name)[1] = <professional_id>` resolution)?
5. Is there a "request deletion of a specific photo" flow for the client that doesn't require trainer approval?

---

## Session 36 — Workout Tracker (Client Logs + Personal Records)

### Goal
Close the program-delivery loop: when a client does today's workout, they tap "Start", log each set's actual weight/reps/RPE, perhaps with rest timer, and submit the session. The system detects personal records (1RM, volume PR, rep PR) and calculates streak counters. Trainer sees actual vs planned instantly.

### Why this order
Workouts are delivered (S31), but without a tracker the feedback loop is broken. This session is the single biggest retention driver because it turns the product from "receive PDF" into "execute plan with feedback."

### Context to Load
- S29, S31 (workouts, client_workouts).
- S27 (exercises).
- `lib/db/rls.ts` (withRLS inside server actions).
- `lib/notifications/send.ts`.
- PRD 6.2 in full.

### Dependencies
- S31, S35 (streaks optional dependency since photos also feed streaks; fine to ship in either order).

### Data Model

**`workout_logs`** (a single session's actual execution):
- `id`, `client_workout_id` FK cascade (unique — one log per assigned session).
- `client_id`, `professional_id` denormalized.
- `started_at`, `completed_at`.
- `total_duration_seconds` int (computed).
- `total_volume_kg` numeric(10,2) — sum of (weight × reps) across all working sets (for progression graphs).
- `total_sets` smallint.
- `rpe_session` numeric(3,1) nullable.
- `notes` text.
- `metadata` jsonb.

**`workout_set_logs`**:
- `id`, `workout_log_id` FK cascade.
- `workout_exercise_id` FK → workout_exercises (the plan reference).
- `exercise_id` FK → exercises (denormalized for queries that skip planning context).
- `set_number` smallint.
- `set_type` `set_type_enum` default `working`.
- `weight_kg` numeric(6,2) nullable.
- `reps` smallint nullable.
- `rir` smallint nullable.
- `rpe` numeric(3,1) nullable.
- `rest_seconds` smallint nullable — actual rest between sets.
- `tempo_actual` text nullable.
- `distance_m`, `duration_seconds` — for cardio.
- `notes` text nullable.
- `skipped` boolean default false.
- `replaced_with_exercise_id` FK → exercises nullable (if client substituted on the fly).

**`personal_records`**:
- `id`, `client_id`, `professional_id` denormalized.
- `exercise_id` FK.
- `pr_type` text — `e1rm | volume | reps_at_weight | best_set_weight | endurance`.
- `value` numeric(10,2) — interpretation depends on type.
- `value_unit` text — `kg | reps | kg*reps | km | seconds`.
- `achieved_at` timestamptz.
- `source_set_log_id` FK → workout_set_logs.
- `previous_record_id` FK → personal_records nullable.
- `delta_pct` numeric(6,2) — % improvement over previous.
- Unique `(client_id, exercise_id, pr_type)` — always holds the current best; history traversed via `previous_record_id` chain.

**`streaks`**:
- `id`, `client_id` unique.
- `current_workout_streak_days` int.
- `longest_workout_streak_days` int.
- `current_checkin_streak_days` int.
- `longest_checkin_streak_days` int.
- `last_workout_date`, `last_checkin_date`.
- `updated_at`.

### Tasks

1. Schema + migration + indexes `(client_id, exercise_id)` on set_logs; `(client_id, pr_type)` on personal_records.
2. **PR detector** — `lib/fit/pr-detector.ts`:
   - Given a new `workout_set_log` row, compute candidate PRs:
     - e1RM via Brzycki: `weight × (36 / (37 − reps))` for reps 1..10.
     - Rep PR at weight: `reps > previous for same weight and exercise`.
     - Best set weight: `weight > previous max for exercise`.
     - Volume PR: for the session, `total_volume_kg > previous max for exercise over a rolling period`.
   - Insert new `personal_records` rows; mark old ones as historical (chain via `previous_record_id`).
   - Return `PR[]` for UI celebration.
3. **Streak engine** — `lib/fit/streak-engine.ts`:
   - On every workout_log completion: update `streaks` atomically; emit `streak_extended` or `streak_broken` events.
   - Daily cron (`trigger/jobs/fit/streak-at-risk.ts`, 20:00 local): for each client with `current_workout_streak_days > 3` and no workout completed today, emit `streak_at_risk` → notification.
4. **Actions** in `lib/actions/fit/workout-logs.ts`:
   - `startWorkoutLog(clientWorkoutId)` — creates a log row, sets workout status=`in_progress`.
   - `logSet({ workoutLogId, workoutExerciseId, setNumber, weight_kg, reps, rpe, rir, rest_seconds? })` — upserts by natural key (workoutLogId, workoutExerciseId, setNumber); calls PR detector; returns any PR hits for UI.
   - `skipSet({ workoutLogId, workoutExerciseId, setNumber, reason })`.
   - `substituteExercise(workoutLogId, workoutExerciseId, newExerciseId)` — records `replaced_with_exercise_id` on subsequent set logs.
   - `completeWorkout(workoutLogId, { rpe_session, notes, rating })` — sets completed_at; computes total_duration, total_volume; sets `client_workouts.status=completed`; fires automation `workout_completed`, `pr_achieved` if any; updates streak.
   - `cancelWorkout(workoutLogId)` — marks skipped.
5. **Queries**:
   - `getOrStartLog(clientWorkoutId)`.
   - `getLogWithSets(logId)`.
   - `listPRs(clientId, { exerciseId? })`.
   - `getVolumeSeries(clientId, exerciseId, window='12w')` — for progression charts.
   - `getLastPerformance(clientId, exerciseId)` — shows "last time: 3×10 @ 80kg" when the tracker opens a set row.
6. **Routes**:
   - `app/portal/_niche/workouts/today/page.tsx` — today's workout card with Start CTA.
   - `app/portal/_niche/workouts/[clientWorkoutId]/page.tsx` — full tracker:
     - Stepper per exercise.
     - Per set: target display, actual inputs, timer, previous performance hint.
     - Superset support (grouped UI).
     - "+ Add set" and "Substitute".
     - Swipe to mark set done on mobile.
     - PR celebration modal when one fires.
   - `app/portal/_niche/workouts/history/page.tsx` — past sessions list + calendar heatmap.
   - `app/portal/_niche/workouts/records/page.tsx` — PR wall per exercise; chart.
   - Trainer views:
     - `app/dashboard/_niche/clients/[id]/fit/workouts/page.tsx` — timeline + adherence %.
     - `app/dashboard/_niche/clients/[id]/fit/workouts/[logId]/page.tsx` — detailed session review with comment box.
7. **Rest timer** — client-side countdown persisted in local storage (survives page refresh).
8. **Offline mode** — critical for gym floors: the tracker page is PWA-cacheable; sets queue in IndexedDB if offline and replay on reconnection. Implement with a small sync helper `lib/fit/offline-sync.ts`.
9. **Components** `components/portal/fit/workouts/`: `WorkoutRunner.tsx`, `ExerciseStep.tsx`, `SetRow.tsx`, `RestTimer.tsx`, `PRCelebration.tsx`, `ExerciseSubstituteDialog.tsx`, `LastPerformanceHint.tsx`, `VolumeChart.tsx`.
10. **Automation triggers** — `workout_started`, `workout_completed`, `pr_achieved`, `workout_missed`, `streak_broken`, `streak_at_risk`.

### RLS

Standard: client manages own logs; trainer reads via professional_clients join. Set logs inherit.

### Verification

- Client starts today's workout; logs 4 working sets for bench press; PR detector fires on a new 1RM; celebration animation renders.
- Offline: disconnect network mid-workout; log 2 more sets; reconnect; sets appear server-side.
- Streak counter bumps on completion; misses a day → counter resets to 0; email sent.
- Trainer sees adherence % on client dashboard (weekly completed / weekly planned × 100).

### Self-check questions

1. Is PR detection idempotent (re-running logSet for the same natural key doesn't duplicate PRs)?
2. Is the offline queue bounded (e.g., no more than 100 events queued; oldest replayed first)?
3. Does the rest timer pause correctly when the phone is locked?
4. Does `substituteExercise` respect `exercise_substitutions` suggestions from S27 for UX (show the preferred sub first)?
5. Are streak calculations timezone-aware per client?

---

## Session 37 — Client Portal Fitness Home & Tabs

### Goal
Unify the fitness features (S31 workouts, S33 nutrition, S34–S36 progress) into a cohesive portal experience: a "Today" home screen with the day's workout, meal plan highlights, streak, quick-log actions, and recent messages. Dedicated top-level tabs for Workouts, Nutrition, Progress, Achievements. Branded in the trainer's colors.

### Why this order
By now all the raw features exist; they need a single landing page that stitches them together so the client has one URL to bookmark.

### Context to Load
- `app/portal/layout.tsx` (existing nucleus shell with trainer-branded header + mobile nav).
- `components/portal/nav-items.ts`.
- S31, S33, S34, S35, S36 portal routes already created (living under `_niche/`).
- PRD 6.1 in full.

### Dependencies
- S31, S33, S34, S35, S36.

### External Services
None.

### Tasks

1. **Home page** — `app/portal/_niche/today/page.tsx` (Server Component):
   - Greeting using trainer's voice (configurable template with `{{client_first_name}}`, `{{local_time_of_day}}`).
   - Today's workout card: name, estimated duration, "Start" CTA → routes to S36 tracker; or if completed, a "✓ Completed in 42 min" summary.
   - Today's meals overview: breakfast/lunch/dinner/snacks with quick-add from plan; water intake widget.
   - Current streak badges + next milestone preview.
   - Next scheduled session (from nucleus appointments, if any).
   - Unread-message preview card.
   - "Log weight" / "Add photo" / "Quick food log" quick-action buttons.
   - Upcoming check-in reminder banner (from S34 wellness schedule).
2. **Portal nav items** — extend `components/portal/nav-items.ts` with a `NICHE_SECTION` that includes:
   - Today (icon `Sparkles`)
   - Workouts (icon `Dumbbell`) — list of today + history
   - Nutrition (icon `Apple`) — meal plan + food log + recipes
   - Progress (icon `TrendingUp`) — measurements + photos + wellness
   - Achievements (icon `Trophy`) — badges + streaks + challenges (S38)
   - Library (icon `BookOpen`) — client view of recipes and exercises assigned to them
3. **Portal sub-routes** (index pages if missing):
   - `app/portal/_niche/workouts/page.tsx` — list (today + upcoming + history + records link).
   - `app/portal/_niche/nutrition/page.tsx` — landing with meal plan snapshot + food log + shopping list tabs.
   - `app/portal/_niche/progress/page.tsx` — chooser for measurements / photos / wellness.
   - `app/portal/_niche/library/exercises/page.tsx` — assigned exercises only (filtered via client_workouts join).
   - `app/portal/_niche/library/recipes/page.tsx` — assigned recipes.
4. **Responsive** — every page mobile-first. Desktop layout adds a two-column split on home (quick-actions right).
5. **Branding** — reuse nucleus portal branding (trainer's primary/secondary colors on CTAs).
6. **Data loaders** — `lib/db/queries/fit/portal.ts`:
   - `getTodayDashboard(clientId, date)` — a single aggregated query returning the entire home screen payload (workout + meals + streak + next session + unread).
7. **Offline readiness** — Today page is added to the service-worker precache list; falls back to the last cached payload when offline.
8. **Onboarding overlay** — first-time portal visit shows a 4-step tour (implemented with a lightweight library like `driver.js` or a custom overlay). S39 will fill in onboarding data; this session handles the post-onboarding coachmark tour.
9. **PostHog events** — `fit.portal.today_viewed`, `fit.portal.quick_action_used`, `fit.portal.tour_completed`.
10. **i18n** — `fit.portal.*` keys.

### RLS
Already enforced by underlying tables; Today query must pass RLS checks transparently.

### Verification

- As an invited client, log in; land on Today page; all four widgets populate.
- Click "Start workout" → lands on S36 tracker with today's session loaded.
- Offline: view Today page from cache; see last data + "offline" banner.
- Mobile (375px): every element is usable with thumb navigation; nothing scrolls horizontally.
- Dark mode respects trainer's branding.

### Self-check questions

1. Is the aggregated query bounded (no N+1) to stay under 200ms?
2. Does the service-worker cache correctly invalidate when trainer updates the program?
3. Are quick-action buttons reachable within one thumb tap on mobile?
4. Is the "greeting" copy localized in both RO and EN?
5. Does the Achievements tab render a stub gracefully before S38 ships, or is it hidden behind a flag until then? (Flag gate — see Tasks.)

---

## Session 38 — Gamification (Badges, Streaks, Challenges, Leaderboards)

### Goal
Turn the measurement + workout + nutrition telemetry into motivational feedback: a catalog of `badges` with declarative award rules, `client_badges` assignments, streak counters (extending S36), `challenges` opt-in events (trainer-defined: "30 days no sugar", "10k steps/day"), `challenge_participants` tracking, optional `leaderboards` per challenge (opt-in for clients who tick "share my progress").

### Why this order
All the events (workout_completed, pr_achieved, photo_uploaded, wellness_logged, food_logged, streak_extended) exist. Now we turn them into celebrations and social proof.

### Context to Load
- All prior fitness telemetry.
- PRD 6.5.

### Dependencies
- S36 (events + streaks live).

### Data Model

**`badges`** (system + trainer-custom):
- `id`, `owner_type` (`system | trainer`), `professional_id` FK nullable.
- `code` text — slug like `first_workout`, `30_day_streak`, `first_pr`, `transformation_month_1`.
- `name`, `name_ro`, `description`, `description_ro`.
- `icon_url`, `color`.
- `rule` jsonb — declarative: `{ event: 'workout_completed', condition: { count_gte: 1 } }` or `{ event: 'streak', condition: { current_days_gte: 30 } }` or `{ event: 'pr_achieved', condition: { exercise_code?: 'bench_press', delta_pct_gte: 5 } }`.
- `tier` smallint default 1 (1=bronze, 2=silver, 3=gold).
- `is_active` boolean.

**`client_badges`**:
- `id`, `client_id` FK, `professional_id` denormalized.
- `badge_id` FK.
- `earned_at` timestamptz.
- `source_event_ref` jsonb — breadcrumb `{ type: 'workout_completed', id: '...' }`.
- Unique `(client_id, badge_id)`.

**`challenges`**:
- `id`, `professional_id` FK cascade.
- `name`, `description`.
- `start_date`, `end_date`.
- `type` text — `streak | cumulative | milestone | ladder`.
- `rule` jsonb — e.g., `{ event: 'food.logged', must_avoid_allergen: 'sugar', duration_days: 30 }` or `{ event: 'steps', daily_min: 10000 }` (steps require S42 wearable).
- `reward` text — trainer's description of the prize ("1 free 1-on-1 session").
- `is_public` boolean — if true, visible on micro-site lead magnet.
- `max_participants` int nullable.
- `visibility` text — `all_clients | tagged | invited_only`.
- `tags_required` uuid[] nullable.
- `is_active` boolean.

**`challenge_participants`**:
- `id`, `challenge_id` FK cascade, `client_id` FK.
- `joined_at`, `completed_at` nullable, `status` text — `active | completed | dropped`.
- `progress` numeric(5,2) — %.
- `score` int.
- `opted_into_leaderboard` boolean default false.
- Unique `(challenge_id, client_id)`.

### Tasks

1. Schema + migration + triggers.
2. **Seed system badges** (~25): First Workout, First Week Complete, 7-Day Streak, 30-Day Streak, 100-Day Streak, First PR, 10 PRs, First Photo, Month 1 Transformation, Month 3, Month 6, First Weight Loss Goal Reached, First Measurement, 30 Wellness Logs, Water Hero (30 days of 2L+), Perfect Nutrition Week, Perfect Adherence Month, Comeback Kid (missed a week, returned and streaked).
3. **Rule engine** — `lib/fit/badges/rules.ts`:
   - `evaluateBadgeRules(clientId, event, payload)` — given an event, find candidate badges; evaluate `rule.condition` against client's historical data; award eligible badges atomically.
   - Called inline on event emission (workout completed, PR achieved, photo uploaded, wellness logged, food logged).
   - Daily cron `trigger/jobs/fit/badge-evaluator.ts` re-scans time-based badges (streak milestones) in case event-driven paths missed.
4. **Actions** in `lib/actions/fit/gamification.ts`:
   - `awardBadge(clientId, badgeCode)` — admin/trainer manual override.
   - `revokeBadge(id)`.
   - `createBadge(input)` — trainer-custom.
   - `createChallenge(input)`, `updateChallenge`, `cancelChallenge`, `joinChallenge(challengeId, clientId?)`, `leaveChallenge`, `optIntoLeaderboard(participantId, value)`.
5. **Queries**:
   - `getClientBadges(clientId)`.
   - `getRecentBadges(professionalId, limit=10)`.
   - `getActiveChallenges(professionalId | clientId)`.
   - `getLeaderboard(challengeId)` — only opt-ins.
6. **Routes**:
   - `app/portal/_niche/achievements/page.tsx` — client's badges gallery + challenges ribbon.
   - `app/portal/_niche/challenges/[id]/page.tsx` — challenge detail + progress bar + opt-in leaderboard toggle.
   - `app/dashboard/_niche/gamification/page.tsx` — trainer: badge catalog, challenge builder, per-client earned-badges view.
7. **Components** `components/portal/fit/achievements/`:
   - `BadgeCard.tsx` (earned vs locked style).
   - `BadgeCelebrationModal.tsx` — fires on earn (confetti animation).
   - `StreakWidget.tsx` — flame icon + current count.
   - `ChallengeProgressBar.tsx`.
   - `LeaderboardTable.tsx` — anonymized by default; opt-in to show name.
8. **Notifications & emails** — "You earned …" email template; in-app push; shareable link.
9. **i18n, PostHog** — `fit.badge.earned`, `fit.challenge.joined`, `fit.leaderboard.opted_in`.
10. **Plan gating** — Challenges behind Growth+; badges on all plans.

### RLS

Badges: system select-open; trainer-owned scoped. `client_badges`: professional reads; client reads own. Challenges: professional manages; clients can SELECT challenges they're eligible for (tags match) even if not joined. Participants: own + professional.

### Verification

- Complete a workout → `First Workout` badge awarded + celebration modal.
- Achieve a bench-press PR → `First PR` badge.
- Build a "30-day no sugar" challenge; invite 3 clients; track their food-log entries; completion awards participation badge.
- Leaderboard shows opted-in participants only, in descending score order.

### Self-check questions

1. Is badge evaluation idempotent (same event re-played doesn't award twice)?
2. Does the cron fall-back path correctly award streak milestones for clients whose event fired on a day with server downtime?
3. Are leaderboards GDPR-safe (opt-in, anonymizable, deletable on request)?
4. Does the celebration modal respect reduced-motion media query?
5. Are trainer-custom badges unique-coded per trainer to avoid clash with system badges?

---

## Session 39 — Client Onboarding Wizard

### Goal
The first-run experience. A newly invited client lands on a guided, linear onboarding: account creation → profile basics → health intake + PAR-Q → GDPR consent → initial measurements + "before" photos → tutorial. At completion, trainer is notified and can optionally auto-assign a program/meal plan.

### Why this order
All features exist; the remaining gap is getting a real client from zero to "ready to train" in < 20 minutes. This session seals the acquisition → activation funnel.

### Context to Load
- Nucleus forms (S12) — Intake and PAR-Q forms will be seeded templates.
- Nucleus client-invitation flow (Clerk org invite + portal onboarding trigger).
- S34 (measurements), S35 (photos).
- PRD 6.6 in full.

### Dependencies
- S31, S34, S35, plus nucleus forms & Clerk invite.

### Tasks

1. **Seed system form templates** — under `lib/forms/templates.ts`:
   - `fit.intake_form` — name, DOB, sex, height, current weight, goals (multi-select), training history, injuries, current activity level, available equipment, preferred session time, motivations, allergies, dietary restrictions.
   - `fit.par_q` — standard Physical Activity Readiness Questionnaire (7 yes/no questions + follow-up).
   - `fit.nutrition_intake` — typical daily eating pattern, supplements, water intake, cooking skill, grocery budget.
   - `fit.gdpr_consent` — explicit consent for health data (Special Category) + optional consent for marketing photos + Terms of Service.
   - `fit.weekly_checkin` — quick Sunday form used by the S34 cron.
   - `fit.nps_survey` — 30-day NPS survey.
   All seeded as `owner_type='system'` system templates, clonable per trainer.
2. **Onboarding flow schema** — extend `professional_settings.metadata` with an `onboarding_flow` key that lets a trainer configure: steps enabled, custom welcome video URL, auto-assign program id, auto-assign meal-plan id, initial form-assignment IDs, photo requirement.
3. **Route** — `app/portal/onboarding/page.tsx` (new, inside portal shell but hidden from nav; shown once `professional_clients.metadata.onboarding_completed != true`):
   - Step 1 — Welcome (trainer video if configured).
   - Step 2 — Profile (name, DOB, sex, height, timezone, locale_units). Writes to `clients` + `clients.metadata`.
   - Step 3 — Health intake (completes `fit.intake_form` + `fit.par_q`). Uses existing form renderer.
   - Step 4 — GDPR consent (explicit checkboxes; on acceptance, writes to `documents` with a PDF copy; stores audit row in `client_consents`).
   - Step 5 — Initial measurements (S34 reusable `WeightEntryForm` + girths; optional).
   - Step 6 — Initial photos (S35 `PhotoUploadSheet`; optional; consent banner reinforcing private-by-default).
   - Step 7 — Tutorial tour (4 coachmarks over the Today screen).
   - Final — mark `onboarding_completed=true`; notify trainer; enqueue automation `client_onboarded` (triggers auto-assignment).
4. **`client_consents` table** — small:
   - `id`, `client_id`, `professional_id`, `consent_type` (`gdpr_health_data | marketing_photos | tos | newsletter`), `granted_at`, `revoked_at` nullable, `document_url`, `metadata`.
5. **Actions** in `lib/actions/fit/onboarding.ts`:
   - `startOnboarding()` — idempotent; returns current step.
   - `submitOnboardingStep(stepKey, payload)` — advances state; validates.
   - `completeOnboarding()` — fires automation.
6. **Resume-anywhere** — state persisted server-side so clients can pause mid-onboarding without losing data.
7. **Dashboard — "Onboarding Checklist" widget** on trainer client profile: shows what's completed, nudge button to resend reminder.
8. **Automation** — `client_onboarded` trigger + action `auto_assign_configured_program` + `auto_assign_configured_meal_plan` (uses onboarding_flow settings).
9. **Reminder emails** — if onboarding not completed within 48 hours of invitation, email nudge; at 7 days, escalate to trainer notification.
10. **Analytics** — onboarding completion rate KPI (PRD 12.2).

### RLS
Client writes own; trainer reads via professional_clients. `client_consents` immutable after insert (no UPDATE policy).

### Verification

- New client receives invite → lands on sign-up → on first portal visit lands on onboarding → completes in < 15 min → arrives on Today page with assigned program + meal plan auto-populated.
- Mid-flow abandon + return → picks up at last completed step.
- Revoking GDPR consent later (from Settings) triggers trainer notification + data retention policy evaluation (see nucleus GDPR module).

### Self-check questions

1. Is the GDPR copy legally sound (explicit consent for Special Category health data per Art. 9)?
2. Is PAR-Q gating correct (certain "yes" answers require medical clearance before program assignment — block auto-assignment with an alert)?
3. Is the PDF consent document retrievable by both client and trainer (via `documents`)?
4. Does the tutorial respect the trainer's brand colors?
5. Is `onboarding_flow` JSON validated server-side so a corrupt trainer setting can't crash the flow?

---

## Session 40 — Fitness Micro-Site Sections

### Goal
Layer fitness-specific sections onto the nucleus micro-site: transformations gallery (pulling from S35 consented photos), class/group-session schedule (with booking integration to nucleus scheduling), service packages & pricing tiers, testimonials with before/after visuals, FAQ focused on fitness topics.

### Why this order
With consent-gated photos in place (S35) the transformations section is safe to build. Marketing activation happens at S40–S41. Portal syndication (no analogue in fitness) would go here in RE; in fitness there's no such thing, so this session takes that slot for expanded public pages.

### Context to Load
- Nucleus micro-site (S16): `app/[slug]/page.tsx`, section renderers, theme resolver.
- S35 for photos + consent.
- PRD 5.5.

### Dependencies
- S35, S31 (packages may reference programs).

### Tasks

1. **Section types** — extend `lib/site-builder/section-types.ts` with:
   - `fit.transformations_gallery` — grid of before/after pairs; pulls only photos with `consent_for_marketing=true`; caption `{months_apart} months transformation`.
   - `fit.class_schedule` — weekly calendar grid of trainer's public availability slots or scheduled group classes (reusing nucleus `appointments` with `type='group'`).
   - `fit.service_packages` — pricing tiers with bullet features and CTA (existing nucleus services extended; fitness adds `features[]` jsonb on service.metadata).
   - `fit.trainer_credentials` — certifications, years of experience, specialties list.
   - `fit.client_stats` — aggregated anonymous stats (e.g., "124 clients coached", "2,873 workouts delivered") — opt-in, computed from aggregates.
   - `fit.faq_fitness` — same as nucleus FAQ but with seeded fitness-common questions.
2. **Section renderers** in `components/micro-site/fit/`:
   - `TransformationsGallery.tsx` — ISR-cached; rate-limited query.
   - `ClassScheduleSection.tsx`.
   - `ServicePackagesSection.tsx` — 3-column pricing layout with featured-tier highlight.
   - `TrainerCredentials.tsx`.
   - `ClientStats.tsx`.
3. **Public query** — `getPublicTransformationGallery(professionalId, limit)`:
   - Select `progress_photos` where `consent_for_marketing=true` AND `visibility='used_in_transformations_with_consent'`.
   - Pair with an earlier photo (same pose, >= 60 days earlier).
   - Strip client PII; include only month markers.
4. **Route** — `app/[slug]/_niche/transformations/page.tsx` — full gallery (if section teases 6, this page shows all).
5. **Route** — `app/[slug]/_niche/packages/page.tsx` — full pricing page with package comparison + "Book consultation" CTA linking to micro-site contact form / booking widget.
6. **Route** — `app/[slug]/_niche/classes/page.tsx` — group-class public schedule; allows RSVP via nucleus booking widget.
7. **Service packages schema extension** — add fitness-specific fields to `services.metadata`:
   - `delivery_mode` — `1_on_1 | group | online | hybrid`.
   - `sessions_count` — for packages (10-session pack).
   - `billing_cycle` — `one_time | monthly | weekly`.
   - `includes[]` — bullet list.
   - `featured` — boolean.
   - `display_order` — smallint.
8. **Consent revocation propagation** — when a client revokes marketing consent (S35), fire `revalidatePath(`/${slug}/transformations`)` so the gallery drops them within minutes.
9. **SEO** — each transformation pair shows only month gap and generic descriptors (no name, no face-identifying detail if the client elected anonymized display); meta tags respect `noindex` opt-out.
10. **Lead-capture CTAs** embedded in every new section.

### Verification

- Consented photo pair renders on public page within ISR window.
- Revoking consent removes pair within 10 min.
- Packages page shows 3 tiers with highlighted featured tier.
- Class schedule shows next 4 weeks of group slots; clicking a slot opens booking widget.
- Lighthouse ≥ 90 mobile on the transformations page.

### Self-check questions

1. Is the transformations pairing logic deterministic (same output for same inputs) to avoid ISR thrash?
2. Does the gallery filter out minors (age < 18)? — Add an explicit check on `clients.metadata.age` computed from `date_of_birth`.
3. Is alt-text generated for accessibility, without leaking PII?
4. Does the class-schedule widget work for anonymous visitors (no portal login required to RSVP)?
5. Are package prices multi-currency-aware (EUR/RON display)?

---

## Session 41 — Fitness Marketing Kit

### Goal
Fitness-specific content production tools atop the nucleus marketing kit (S17): workout-of-the-day (WOTD) social templates, transformation-story email campaigns, weekly progress emails, fitness lead magnets (7-day starter plan, macro calculator PDF, 20 healthy breakfast ideas), referral-flow specifically for fitness ("refer a friend, get a free session").

### Why this order
With all content sources available (programs, meal plans, transformations), the marketing layer can pull from real data. This is the growth engine.

### Context to Load
- Nucleus Marketing Kit (S17): email_campaigns, social_templates, lead_magnets.
- S35 transformations gallery (for social posts).
- PRD 5.6.

### Dependencies
- S29, S32, S35, S40.

### Tasks

1. **Social template categories** — extend `social_templates.category` enum with fitness-specific values: `wotd`, `transformation`, `nutrition_tip`, `motivation`, `client_spotlight`, `new_program_launch`, `myth_busting`.
2. **WOTD generator** — `lib/fit/social/wotd-generator.ts`:
   - `generateWOTD({ programId, workoutId, style })` → produces a branded Instagram square / story / reel-cover PNG with the workout summary (exercises, sets × reps), trainer logo, CTA.
   - Canvas-based (reuse nucleus `html2canvas` pattern from S17 OR server-side Satori if `@vercel/og` is available).
3. **Transformation card** — `lib/fit/social/transformation-card.ts`:
   - Accepts a transformation pair (with consent already verified); outputs square + story with before/after slider visual + quote.
4. **Fitness email campaign templates** — React Email in `emails/fit/`:
   - `fit-welcome-sequence-day1.tsx` — "Bine ai venit! Iată ce urmează…"
   - `fit-welcome-sequence-day3.tsx` — first-workout motivation.
   - `fit-welcome-sequence-day7.tsx` — check-in prompt.
   - `fit-weekly-progress.tsx` — auto-generated weekly summary with measurements + workouts completed (links to S43 weekly recap PDF).
   - `fit-program-milestone.tsx` — "You've completed 12 workouts!" (trigger: program 25% complete).
   - `fit-transformation-story.tsx` — client-featured (with consent) for newsletter.
   - `fit-re_engagement_14d_inactive.tsx` — "We miss you" copy.
   - `fit-refer_a_friend.tsx` — with unique referral URL token.
5. **Lead magnets** — create 3 seeded fitness lead magnets (trainer can clone):
   - 7-day home workout plan PDF.
   - Macro calculator interactive (lives on micro-site).
   - 20 healthy breakfasts recipe book (PDF).
6. **Macro calculator micro-site widget** — `app/[slug]/_niche/lead-magnet/macro-calculator/page.tsx`:
   - Public; captures email on submit; returns personalized calorie + macro targets; feeds lead into nucleus pipeline + creates optional buyer-profile-equivalent record (a "prospect goal" row).
7. **Referral system** — `client_referrals` table + actions:
   - Unique link per client; `/{slug}/r/{token}`.
   - On lead conversion via link, attribute to referrer; award configurable reward (free session, discount).
   - Dashboard: referrers leaderboard.
8. **Marketing action hooks** — every new fitness campaign sends `fit.campaign.sent` event; template name recorded.
9. **Plan gating** — social templates (all plans), email campaigns (Growth+), transformation auto-emails (Pro+).

### Verification

- Generate a WOTD image for today's Push workout → PNG downloadable, trainer-branded.
- Send welcome-sequence-day-1 to a client → receives properly rendered email.
- Macro calculator lead magnet: submit as anonymous → receive PDF in email + appear in leads.
- Referral link: visitor signs up → referrer's "rewards earned" counter increments.

### Self-check questions

1. Are template variables escaped against injection?
2. Is the WOTD generator deterministic (same inputs → same image) for caching?
3. Does the weekly progress email respect the client's notification prefs?
4. Is the referral attribution cookie-based (90 days) or query-param-based? Prefer query-param + short cookie to survive direct link sharing.
5. Can a trainer opt out of the transformation-story template if they have no consented photos yet?

---

## Session 42 — Wearables & Health Imports

### Goal
Let clients import daily activity, sleep, and food-log data from external sources: Apple Health (via a lightweight Shortcuts-based pipeline until a native app ships), Google Fit (OAuth), and MyFitnessPal (community-API food log import). Data lands in normalized tables and surfaces in client dashboards and trainer views.

### Why this order
The core product works without wearables. Adding them here, after the core loop is proven, means the integration cost is justified by retention uplift measurements.

### Context to Load
- PRD 7.4 Faza 2.
- `lib/supabase/admin.ts` for OAuth token storage (encrypted).
- S34 (measurements), S33 (food log) — import targets.

### Dependencies
- S33, S34, S36.

### External Services
- **Google Fit**: Google Cloud project + OAuth client.
- **Apple Health**: iOS-side Shortcuts (stubbed in MVP — user exports a CSV; we import).
- **MyFitnessPal**: community-maintained endpoints (evaluate ToS; document risk).

### Data Model

**`device_connections`**:
- `id`, `professional_id` FK (nullable — client-owned link), `client_id` FK.
- `provider` text — `google_fit | apple_health | myfitnesspal | fitbit`.
- `status` text — `connected | disconnected | error`.
- `access_token_encrypted` text, `refresh_token_encrypted` text, `expires_at` timestamptz.
- `scope` text[].
- `last_sync_at`, `last_sync_status`, `last_error`.
- `metadata` jsonb.

**`device_data_points`** (normalized activity):
- `id`, `client_id`, `connection_id` FK.
- `data_type` text — `steps | active_minutes | calories_burned | distance_m | sleep_minutes | sleep_quality | heart_rate_avg | heart_rate_resting | vo2_max | weight_kg | body_fat_pct | workout_session`.
- `recorded_at` timestamptz.
- `value` numeric.
- `unit` text.
- `source_provider` text.
- `source_id` text — provider's own ID for idempotency.
- `metadata` jsonb.
- Unique `(connection_id, data_type, recorded_at, source_id)`.

### Tasks

1. Schema + migration. Encrypt access/refresh tokens at rest via `pgcrypto` symmetric (key from `ENCRYPTION_KEY` env).
2. **Provider abstraction** — `lib/fit/wearables/provider.ts`:
   ```ts
   interface WearableProvider {
     buildAuthUrl(clientId): string;
     exchangeCode(code): Promise<Tokens>;
     refresh(connection): Promise<Tokens>;
     sync(connection, since): Promise<DataPoint[]>;
     disconnect(connection): Promise<void>;
   }
   ```
3. **Implementations**:
   - `google-fit.ts` — OAuth flow + REST sync for steps, active_minutes, calories, sleep, heart_rate.
   - `apple-health.ts` — MVP: CSV import endpoint accepting Shortcuts-exported HealthKit data; parses into device_data_points.
   - `myfitnesspal.ts` — community endpoint wrapper; fetches food_log entries; maps each MFP food to nearest `foods` row via fuzzy match; inserts `client_food_log_entries` with `source='wearable_import'`.
4. **Sync job** — `trigger/jobs/fit/wearable-sync-poller.ts`:
   - Every 30 min for `google_fit` connections: call `provider.sync(c, since=last_sync_at)`.
   - Idempotent via `(connection_id, data_type, recorded_at, source_id)` unique.
   - On auth failure: set status=`error`, notify client.
5. **Routes**:
   - `app/dashboard/_niche/wearables/page.tsx` — trainer settings (enable providers globally, configure MFP agent header, see sync stats per client).
   - `app/portal/_niche/progress/connections/page.tsx` — client connect/disconnect; last sync; data-point previews.
   - `app/api/wearables/oauth/google/callback/route.ts` — OAuth return handler.
   - `app/api/wearables/apple-health/upload/route.ts` — CSV upload for HealthKit export.
6. **Rendering in existing pages**:
   - Today page (S37): "Steps today: 7,432 (target 10k)".
   - Measurements page (S34): if device_data_points has weight_kg, offer "Import today's scale weight" CTA.
   - Food-log page (S33): if MFP connected, show "Imported X entries from MyFitnessPal today" banner.
7. **Automation triggers** — `steps_goal_reached`, `sleep_low_3d`, `weight_imported_from_scale`.
8. **Privacy** — clients can disconnect + trigger a full data-wipe action that hard-deletes all their device_data_points.
9. **Plan gating** — Wearables on Growth+.
10. **i18n, PostHog** — `fit.wearable.connected`, `fit.wearable.synced`, `fit.wearable.import_failed`.

### RLS

- `device_connections`: client manages own; trainer reads via professional_clients.
- `device_data_points`: same.

### Verification

- Client connects Google Fit; OAuth returns; `device_connections.status=connected`.
- Sync cron runs; `device_data_points` has today's steps.
- Import CSV from Apple Health Shortcuts (test file); rows ingested.
- MFP import: previous-day food log appears under client food-log with `source='wearable_import'`.
- Disconnect → wipe data → counts go to 0.

### Self-check questions

1. Are OAuth tokens encrypted at rest AND in logs (never logged)?
2. Is the MFP integration resilient to their API changes (no fail-loud; degrade gracefully)?
3. Is there a legal note about Apple Health data residency (stored in EU Supabase)?
4. Does the HealthKit CSV parser handle malformed input without crashing?
5. Does the sync cron back off on error (exponential)?

---

## Session 43 — Fitness Automations, Analytics & AI Assistants

### Goal
The "intelligence" session. Three bundled capabilities: (1) register all fitness-specific automation triggers and actions atop the nucleus engine + pre-built workflow templates; (2) fitness KPIs added to the analytics dashboard (retention, adherence, compliance, progress); (3) AI assistants using Anthropic Claude Sonnet 4.6 / Opus 4.7 for workout generation, meal-plan drafting, and smart progress insights (PRD §8).

### Why this order
All the raw data + events now exist. This session turns them into proactive, pattern-recognizing value for the trainer.

### Context to Load
- Nucleus automation engine (S18).
- Nucleus analytics (S19).
- All prior fitness outputs.
- Anthropic API docs (prompt caching, tool use, system prompts).
- PRD 5.9, 5.10, §8.

### Dependencies
- S26–S42.

### Tasks

#### Part A — Automations

1. Register fitness-specific **trigger types** in `lib/automations/types.ts`:
   - `program_assigned`, `program_completed`, `workout_completed`, `workout_missed`, `pr_achieved`, `streak_extended`, `streak_broken`, `streak_at_risk`.
   - `measurement_logged`, `weight_goal_reached`, `plateau_detected` (from AI insight).
   - `photo_uploaded`, `transformation_milestone_reached` (30/60/90 days with consented pair).
   - `food_log_compliance_low_3d`, `meal_plan_assigned`, `water_goal_achieved_7d`.
   - `client_inactive_5d`, `client_onboarded`, `client_renewed`.
   - `challenge_joined`, `challenge_completed`.
2. Register fitness-specific **action types**:
   - `assign_program`, `assign_meal_plan`, `send_workout_pdf`, `send_weekly_recap`, `grant_badge`, `create_check_in_task`, `schedule_1_on_1_session`, `trigger_ai_insight_review`, `offer_discount`.
3. **Pre-built workflow templates** (populated in `lib/automations/templates.ts`):
   - "7-day welcome sequence" — day 0 welcome email + tutorial; day 3 first-workout nudge; day 7 review check-in.
   - "Plateau intervention" — `plateau_detected` → notify trainer + AI suggestion → trainer reviews → offer meal-plan adjustment email.
   - "Streak protection" — `streak_at_risk` → push notification + motivational email.
   - "Transformation celebration" — `transformation_milestone_reached` → email client + social-post draft to trainer.
   - "Re-engagement" — `client_inactive_5d` → email + badge offer; 10d → trainer task.
   - "Post-program follow-up" — `program_completed` → survey + offer next program.

#### Part B — Analytics

4. **Fitness KPI queries** in `lib/db/queries/fit/analytics.ts`:
   - `getAdherenceStats(professionalId, window)` — completed_workouts / assigned_workouts × 100, aggregated + per-client.
   - `getRetentionCohorts(professionalId)` — monthly cohort retention grid.
   - `getMacroComplianceAverage(professionalId, window)` — mean daily macro adherence.
   - `getProgressionLeaders(professionalId)` — top 10 clients by PR count or weight loss in window.
   - `getChurnRisk(professionalId)` — clients with adherence < 50% for 14 days.
   - `getBusinessMetrics(professionalId)` — LTV estimate, ARPU, session-attended rate.
5. **Dashboard widgets** — extend `app/dashboard/analytics/page.tsx`:
   - KPI cards: Active clients, Average adherence %, 30-day retention, Clients at risk, Total PRs this month.
   - Charts: Adherence over time (line), Retention cohorts (heatmap), Macro compliance distribution (histogram), Churn-risk breakdown (bar).
   - Per-client drilldown modal.
6. **Weekly client recap** — Trigger.dev job `trigger/jobs/fit/weekly-client-recap.ts`:
   - Sunday 20:00 local per professional.
   - For each active client: aggregate workouts completed, PRs, measurements delta, adherence %; render `lib/fit/reports/client-weekly-recap.tsx` (React-PDF); email + store in `documents`.
   - `fit.client.weekly_recap_sent` event.
7. **Trainer compliance digest** — Monday 07:00 local:
   - Summary across all clients: top performers, at-risk clients, this week's PRs, adherence distribution.
   - Email + dashboard banner.

#### Part C — AI Assistants

8. **Env** — `ANTHROPIC_API_KEY`; register models via `ANTHROPIC_MODEL_DRAFT=claude-sonnet-4-6` and `ANTHROPIC_MODEL_REVIEW=claude-opus-4-7`.
9. **AI workout generator** — `lib/fit/ai/workout-generator.ts`:
   - Input: goal, level, equipment available, sessions/week, duration/session, preferences, injuries.
   - Prompt-caching friendly: system prompt (~2k tokens of programming principles) cached; user variables appended.
   - Output: structured JSON representing a program → validated by Zod → auto-inserted as `draft` status program for trainer review.
   - Tool use: calls a `get_exercises(muscle_group, equipment)` tool that returns curated subset from S27.
10. **AI meal-plan generator** — `lib/fit/ai/meal-plan-generator.ts`:
    - Input: TDEE target, macros target, dietary flags, allergens, preferences, training days, grocery budget.
    - Output: 7-day meal plan → validated → inserted as draft.
11. **Smart insights** — `lib/fit/ai/smart-insights.ts`:
    - Scheduled weekly analysis per client: feed the last 4 weeks of data (adherence, volume progression, body metrics, wellness) to Claude Opus 4.7 (reviewer model).
    - Output: observations + recommendations ranked by impact.
    - Surfaces in `app/dashboard/_niche/clients/[id]/fit/insights/page.tsx`.
12. **Dashboard route** — `app/dashboard/_niche/ai-assistant/page.tsx` with generator launchers and review queue.
13. **Feature flag** — `fit_ai_features` default OFF; enable per trainer via settings (Pro plan gate).
14. **Cost controls** — per-professional monthly AI budget (`professional.metadata.ai_budget_eur`); log per-call cost from Anthropic response.
15. **PostHog events** — `fit.ai.workout_drafted`, `fit.ai.meal_plan_drafted`, `fit.ai.insight_generated`, `fit.ai.insight_acted_upon`.

### Verification

- Complete a client's workout → automation chain fires → badge awarded + email sent.
- Weekly recap cron runs Sunday → PDF in client inbox + stored.
- AI workout generator produces a valid 4-week program draft that passes S29 validation; trainer reviews and publishes.
- Analytics page shows 5 new fitness KPI cards; drill-downs work.
- Smart-insights picks up a plateaued client and recommends a deload week.

### Self-check questions

1. Are AI outputs always validated against schemas before DB insert?
2. Is prompt caching wired correctly (system prompt reused across calls to the same model) for cost savings?
3. Does the weekly recap respect the professional's timezone, not the server's?
4. Are analytics queries scoped to the professional's RLS context (must use `withRLS`, not dbAdmin)?
5. Is there a kill-switch to disable AI features instantly (env flag + feature flag) if a model misbehaves?

---

## Session 44 — End-to-End Testing & Quality Gate

### Goal
Comprehensive Playwright test suite covering the golden paths of every fitness module from both the trainer and client personas. RLS regression tests. Visual diffs on emails and PDFs. Accessibility and performance audits. CI integration.

### Why this order
Must come after every module exists. Earlier testing gets rewritten constantly.

### Context to Load
- `tests/e2e/smoke.spec.ts`, `playwright.config.ts`, `tests/fixtures/auth.setup.ts`.
- All fitness modules S26–S43.
- Nucleus Playwright conventions from S25.

### Dependencies
- S26–S43.

### Tasks

1. **Test fixtures**:
   - `fixtures/fit/trainer.setup.ts` — seeded professional with 3 clients, 2 programs, 1 meal plan, 20 client_workouts, 10 workout_logs, 5 photos (one consented).
   - `fixtures/fit/active-client.setup.ts`, `fixtures/fit/onboarding-client.setup.ts` — signed-in client sessions.
   - Mock external services: Resend (capture to fixture), Anthropic (return canned JSON), Google Fit (mock OAuth + sync).
2. **Golden-path specs** (one file per module):
   - `fit/exercises.spec.ts` — create custom exercise; clone from system; archive; video upload.
   - `fit/programs.spec.ts` — build 12-week program via builder; supersets; publish.
   - `fit/program-assignment.spec.ts` — assign to client; pause/resume; reschedule single workout.
   - `fit/meal-plans.spec.ts` — build plan; training/rest variants; macro rollups correct.
   - `fit/recipes-and-food-log.spec.ts` — recipe CRUD; shopping list generation; client logs a food entry; compliance calc.
   - `fit/measurements.spec.ts` — weight + girth entry; wellness log; trend chart renders.
   - `fit/photos.spec.ts` — upload via mobile emulation; EXIF scrub; comparator slider; consent flow.
   - `fit/workout-tracker.spec.ts` — full workout log; PR detection; streak update; offline queue replay.
   - `fit/portal-today.spec.ts` — Today page renders all widgets; quick-actions work.
   - `fit/gamification.spec.ts` — earn badge; join challenge; leaderboard opt-in.
   - `fit/onboarding.spec.ts` — full 7-step onboarding; consent PDF generated; auto-assignment fires.
   - `fit/micro-site.spec.ts` — transformations section renders consented pair only; package page loads; class schedule RSVP creates lead.
   - `fit/marketing.spec.ts` — WOTD image generated; welcome-sequence email fires; macro calculator lead magnet; referral link attribution.
   - `fit/wearables.spec.ts` — Google Fit OAuth; Apple Health CSV upload; data-point rendering on Today.
   - `fit/ai-assistants.spec.ts` — generator run → draft program saved; feature flag off hides module.
   - `fit/analytics.spec.ts` — adherence KPI calculates correctly; retention cohort renders.
3. **RLS regression tests** — `tests/rls/fit.spec.ts`:
   - Each tenant-scoped table: attempt read/write as wrong professional → reject.
   - Client: attempt to read another client's logs/photos → reject.
   - Anon: attempt to list `progress_photos` → reject; attempt published-slug gallery → allowed.
   - System row edits from trainer path → blocked.
4. **Email visual tests** — render each email via `/api/emails/preview/[template]` and diff against baseline (PNG at 1200px width).
5. **PDF visual tests** — render `client-weekly-recap`, `shopping-list`, `consent-document`, `workout-pdf` (if S41 ships one) → PNG → baseline diff.
6. **Accessibility audit** — axe-playwright on `/portal/_niche/today`, `/dashboard/_niche/programs/[id]`, `/[slug]/_niche/transformations`.
7. **Performance** — Lighthouse CI on public transformations page; score ≥ 90 mobile.
8. **Security**:
   - CSP headers validated.
   - Rate-limit tests on macro-calculator, class-schedule RSVP, lead-magnet download, onboarding endpoints.
   - Injection attempts on exercise / food search fields.
   - Photo upload: attempt malicious MIME; attempt oversized.
9. **Migration test** — fresh DB → all migrations apply → seed data → smoke test passes.
10. **CI** — `.github/workflows/fit-e2e.yml` runs this suite on every PR that touches fit/*.

### Verification

- `npm run test:e2e` passes with 100% green.
- RLS tests 100% green.
- Visual diffs: 0 baseline violations.
- Lighthouse ≥ 90 mobile/desktop on public pages.
- axe: 0 critical/serious violations.

### Self-check questions

1. Are tests deterministic (no flaky clocks, no real network)?
2. Are test fixtures isolated per test (no cross-pollution)?
3. Are external-service mocks faithful (same shapes as real responses)?
4. Do RLS tests catch a regression if a policy is accidentally loosened?
5. Is there a CI matrix covering Chromium + WebKit + mobile viewport?

---

## Session 45 — Credentials, API Keys & Go-Live Readiness

### Goal
Collect every credential, configure every external service for production, produce a deployment runbook, and perform the final smoke on a real Stripe/Clerk/Supabase production stack. The user's explicit ask: obtain all the credentials and finish end-to-end.

### Why this order
Last. All modules must exist before we finalize their real credentials.

### Context to Load
- `docs/api-keys-setup.md`, `docs/analysis-api-keys.md`, `docs/cost-model.md` — existing nucleus docs; extend with fitness-specific costs.
- `lib/env.ts` — full schema.
- `SESSION-25-READINESS.md` — nucleus baseline checklist.

### Dependencies
- S26–S44.

### Tasks

1. **Service-by-service checklist** (for each: create account, note plan/tier, capture keys, rotate defaults, verify):
   - **Clerk** — Production instance, custom domain for sign-in, webhook signing secret, Organizations enabled, session token includes `org_id`, custom claims for client vs trainer role.
   - **Supabase** — Production project (EU region, GDPR), PITR enabled, service-role key secured, storage buckets provisioned (`progress-photos` private + existing avatars/documents/media/marketing), `pg_trgm` + `pgcrypto` extensions verified, RLS enabled on every fitness table, Realtime publication for `client_workouts`, `workout_set_logs`, `messages`, `notifications`, `progress_entries`.
   - **Stripe** — Live mode; four fitness plans created (Starter 29€, Growth 59€, Pro 99€, Enterprise custom contract); EUR + RON prices; tax rates configured; webhook endpoint with live signing secret; Customer Portal customized with FitCore Pro branding; tax IDs collection; subscription metadata on `professional.id`.
   - **Resend** — Custom domain verified (SPF/DKIM/DMARC); per-plan send quotas configured; suppression list imported from beta.
   - **Upstash Redis** — Production DB; EU region; rate-limit namespaces for the new fitness public endpoints (macro calculator, referral link click).
   - **Trigger.dev** — Production project; env vars synced separately from Vercel; all fitness cron schedules activated: `materialize-weekly-workouts` (Sun 23:00), `check-in-reminder` (Sun 19:00), `photo-reminder` (configurable), `badge-evaluator` (daily 04:00), `streak-at-risk` (daily 20:00), `wearable-sync-poller` (every 30 min), `weekly-client-recap` (Sun 20:00), `trainer-compliance-digest` (Mon 07:00), `ai-plan-draft` (on-demand).
   - **Sentry** — Project created; release tracking wired to Vercel builds; PII filter verified against fitness payloads (no weight, height, measurements, photo URLs leak).
   - **PostHog** — EU cloud; all `fit.*` events registered; feature flags: `fit_ai_features`, `fit_wearables`, `fit_challenges`, `fit_transformations_public`.
   - **Anthropic** — Production API key; usage tier validated (Opus 4.7 requires tier 2+); monthly budget alerting set at 80% / 100%; prompt-caching verified with logs showing cache hits.
   - **USDA FoodData Central** — Free production API key; seed-script validated against production quotas; one-time run on production DB.
   - **Google Fit** — Production OAuth client; verified app for sensitive scopes; OAuth consent screen content matches TOS; privacy policy URL points to production `/legal/privacy-policy`.
   - **MyFitnessPal** — Document the community-endpoint risk; add feature flag `fit_mfp_integration` defaulted off for production until legal sign-off.
2. **Env vars consolidation** — `.env.production.example` committed to repo with placeholders + comments; real values in Vercel encrypted env; `lib/env.ts` validates all additions (`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL_*`, `USDA_API_KEY`, `GOOGLE_FIT_*`, `YOUTUBE_API_KEY`, `CRON_SECRET_FIT`, `ENCRYPTION_KEY` for wearable tokens, `AI_FEATURES_ENABLED`, `FIT_AI_BUDGET_DEFAULT_EUR`).
3. **Deployment runbook** — `docs/DEPLOYMENT-FITCORE.md`:
   - Vercel project setup (domains, env vars, build settings, ISR cache, cron secrets).
   - Supabase migration apply procedure (preview branch → staging → production; `db push` not `db reset`).
   - Cutover plan (pre-checks, DNS, post-checks).
   - Rollback plan.
   - Known risks: MFP endpoint instability, Apple Health pre-native stopgap.
4. **Monitoring & alerting**:
   - Sentry alert rules (error rate spike, new issue, perf regression, Anthropic 5xx).
   - PostHog alerts (onboarding drop, weekly recap open rate drop).
   - Uptime monitoring pinging `/api/health`.
   - Supabase alerts (DB CPU, storage approaching `max_progress_photo_storage_mb`).
   - Stripe alerts (webhook failures, churn).
   - Trigger.dev alerts (job failure rate spike, cron missed).
5. **Business operations setup**:
   - Terms & conditions + Privacy Policy finalized (explicit Health-Data consent, GDPR Art. 9 basis, DPA template).
   - Cookie consent banner with analytics opt-in.
   - ANPC (Romanian consumer protection) footer links.
   - Medical disclaimer on all workout content ("Consult a physician before starting any program").
6. **Backup & recovery**:
   - Supabase PITR verified (restore drill on staging).
   - Export cron for critical fitness tables (`programs`, `client_programs`, `client_workouts`, `workout_logs`, `progress_photos` metadata, `client_consents`).
7. **Security review**:
   - Secrets scan on repo (git-secrets / truffleHog).
   - Dependency audit (`npm audit`; fix or justify highs).
   - CSP header finalized.
   - Progress-photo signed-URL TTL verified.
   - Rate limits verified on every public endpoint.
   - GDPR export / delete flows tested end-to-end against a test client with full fitness data.
8. **Final smoke** on production:
   - Sign up as trainer → verify email → subscribe to Growth plan → onboard a real test client → complete onboarding → assign program + meal plan → client starts workout → logs sets → earns badge → uploads consented photo → appears on public micro-site transformations → trainer receives weekly recap on Sunday.
9. **Handoff documentation**:
   - `docs/README.md` — product description, architecture overview.
   - `docs/operations-handbook.md` — who to call when what breaks.
   - `docs/feature-matrix.md` — final inventory mapped to PRD sections.
10. **Tag release** — `git tag v1.0.0-fitcore`; changelog published.

### Verification

- Every env var set in production.
- All external webhooks verified live (Clerk, Stripe, Google Fit OAuth).
- Signup-to-first-workout-completion flow runs on production without manual intervention.
- Monitoring dashboards populated with real traffic from smoke test.
- Backups verified.

### Self-check questions

1. Is any credential stored in code, git history, or `.env` committed? (None should be.)
2. Are test/dev credentials fully separated from production?
3. Is there a documented process to rotate any single key in < 30 minutes?
4. Is the team ready to support an on-call rotation during launch week?
5. Is there a kill-switch feature flag for each major fitness module (programs, nutrition, photos, wearables, AI) to disable without deploy if a bug lands in prod?

---

# After S45 — Day-2 Operations

This plan delivers a fully functional fitness CRM. Beyond it:

- **Native mobile app** (PRD §7.5 Faza 2) — React Native / Expo with true HealthKit integration, Apple Watch / WearOS companion, push-native notifications — v1.1.
- **Advanced AI features** — live form-check via video upload, conversational coach chatbot, auto-progressing programs based on logged performance — v1.2.
- **Wearable expansion** (PRD §7.4 Faza 2) — Garmin, Whoop, Oura, Fitbit with first-class sync and recovery metrics — v1.2.
- **Group training / class management** — multi-client sessions, group programming, class packs — v1.3.
- **Marketplace** — trainers sell programs to other trainers; revenue share — v1.4.
- **Multi-locale expansion** — ES / IT / FR / DE with localized food databases — v1.3.
- **White-label / studio plan** — multi-trainer, sub-accounts, shared clients, centralized branding — v1.3.

---

# Appendices

## A. Task-tracking suggestion

Use GitHub Issues / Linear with labels `session/26` through `session/45`. Each session's task list above maps one-to-one to tickets.

## B. Commit messages

Follow the observed pattern: `session26: fit foundations`, `session27: exercise library`, `session29: programs schema`, etc.

## C. Mapping PRD sections to sessions

| PRD § | Topic | Session(s) |
|---|---|---|
| 1 Executive Summary | — | — |
| 2 Strategic Context | — | — |
| 3 Personas | — | — |
| 4.1 Tech stack | covered by nucleus | — |
| 4.2 Multi-tenant architecture | covered by nucleus | — |
| 4.3 Core entities | data model tables defined across | S26–S36, S38, S39 |
| 5.1 Trainer dashboard (KPIs, feed) | KPIs added in | S43 |
| 5.2.1 Lead pipeline | nucleus S9 (no delta) | — |
| 5.2.2 Client profile fitness tabs | | S31, S33, S34, S35, S36, S38 |
| 5.2.3 Tags | nucleus S8 (no delta) | — |
| 5.2.4 Bulk actions | nucleus (no delta) | — |
| 5.3 Program Builder | | S29, S30 |
| 5.4 Nutrition Builder | | S28, S32, S33 |
| 5.5 Micro-site | nucleus S16 + fitness sections | S40 |
| 5.6 Marketing Kit | nucleus S17 + fitness kit | S41 |
| 5.7 Scheduling | nucleus S11 (no delta) | — |
| 5.8 Forms | nucleus S12 + seeded fitness templates | S39 |
| 5.9 Automations | nucleus S18 + fitness triggers/actions | S43 |
| 5.10 Analytics | nucleus S19 + fitness KPIs | S43 |
| 5.11 Messaging | nucleus S10 (no delta) | — |
| 5.12 Invoicing | nucleus S15 (no delta; reused for packages) | — |
| 6.1 Client portal dashboard | | S37 |
| 6.2 Workouts (client view) | | S36, S37 |
| 6.3 Nutrition (client view) | | S33, S37 |
| 6.4 Progress tracking | | S34, S35 |
| 6.5 Gamification | | S38 |
| 6.6 Onboarding | | S39 |
| 7.1 Auth & Security | covered by nucleus | — |
| 7.2 GDPR | nucleus + fitness-specific consents | S35, S39, S45 |
| 7.3 Notifications | nucleus S14 + fitness types | S31, S34, S36, S38 |
| 7.4 Integrations — Faza 1 (iCal/Zoom/Stripe) | nucleus | — |
| 7.4 Integrations — Faza 2 (wearables) | | S42 |
| 7.5 Mobile (PWA Faza 1) | nucleus S24 + offline workouts | S36, S37 |
| 7.6 i18n | nucleus S22 + fitness keys | across |
| 8 AI features | | S43 |
| 9 User flows | proven end-to-end | S44 |
| 10 Non-functional | | S44, S45 |
| 11 Roadmap | 20 sessions S26–S45 | this document |
| 12 KPIs | measured via analytics | S43 |
| 13 Risks | mitigations across sessions | — |
| 14 Go-to-market | credentials + business ops | S45 |
| 15 Project structure | enforced across every session | — |
| 16 Appendix / glossary | — | — |

## D. When Claude Code gets stuck

- **Migration won't apply**: check for existing conflicting table/policy; use `DROP IF EXISTS` only in development; in production, write a corrective migration.
- **RLS blocks a legit action**: test the policy against `currentProfessionalIdSql` / `currentClientIdSql` by running the `using` expression in psql with `SET LOCAL ROLE authenticated` and a set `request.jwt.claims`.
- **Trigger.dev job fails**: check the Trigger.dev dashboard env vars (managed separately from Vercel); verify `DATABASE_URL` on the job runner is the DIRECT connection, not pooler.
- **External API blocks progress**: scaffold the abstraction (e.g., `lib/fit/wearables/provider.ts`), ship with a mock provider or CSV fallback, return to the integration later.
- **AI call times out**: Anthropic max `max_tokens` + response streaming. For long program drafts, use streaming with a progressive parser that rejects on partial-invalid JSON.
- **Photo upload fails silently**: check signed-URL expiry, bucket CORS, and that the EXIF-strip `sharp` pipeline is on the server (not edge runtime).
- **PR detector emits duplicates**: confirm idempotency on `(workout_log_id, workout_exercise_id, set_number)` uniqueness before running detector; detector itself must be idempotent on same inputs.

## E. How to measure "fully functional"

Success definition: a real Romanian personal trainer can, end-to-end, from a signup on the marketing page:

1. Subscribe to a Growth plan.
2. Build their micro-site in < 1 hour.
3. Create a custom exercise, a 12-week program, and a 4-week meal plan in < 2 hours.
4. Invite 5 clients who receive an intuitive portal invitation.
5. Onboard 4 of the 5 in the first week (> 80% onboarding completion).
6. Assign programs and meal plans automatically via S39 auto-assignment.
7. Have those clients log workouts, food, measurements, and photos in weeks 1–4.
8. See > 60% weekly adherence per client in the dashboard.
9. Receive an auto-generated weekly recap the clients actually read (`opened_at` > 0).
10. Monetize via invoices against the services catalogue; churn < 10% by month 3.

If every item above works on production with a single paid tenant (and a second tenant to validate RLS isolation), S45 is complete and the product is in pre-alpha → alpha.

---

**End of FitCore Pro Delta Implementation Plan v1.0**

*Prepared as a sequential, dependency-ordered companion to `nucleus-Implementation-Plan.md` and `FitCorePro-PRD-v1.0.md`. Execute S26 → S45 in order. No session may be skipped. Every session is committable in isolation. The assign → log → adjust loop (programs + meal plans delivered, workouts + food + measurements + photos logged, insights reviewed and applied) is the product's soul — every design decision should reinforce it.*



