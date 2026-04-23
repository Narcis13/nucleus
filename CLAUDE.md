
# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

# Project Context (Durable)

These facts outlive any single session and apply to every contributor. Verify against current code before citing as fact — point-in-time observations drift.

## Rails migration — decided 2026-04-23

Nucleus is moving from Next.js 16 + RSC to Rails 8 + Hotwire. The 2-week spike finished in ~5 working days and passed 5 of 6 decision-gate questions. Part B (the 28-session full rebuild) is greenlit.

- **Active plan:** `docs/Nucleus-Rails-Implementation-Plan-v1.0.md` (sessions Rs1–Rs28).
- **Working repo:** `nucleus-rails-spike/` is the spike. Part B lands in `nucleus-rails/` (sibling to `core-pro/`).
- **Commit format:** one commit per session, `Rs{N}: <summary>` (e.g. `Rs5: clients CRUD + tags`). The spike days use `Spike Day N: <summary>`.
- **Stack locked in:** Clerk (via `clerk-sdk-ruby`), Supabase Postgres + ActiveRecord + `acts_as_tenant` + RLS, ActionCable on Solid Cable, SolidQueue, Pay gem for Stripe (track `~> 11.0` — plan's `~> 8.0` pin is stale), Resend + ActionMailer, Kamal 2 on Hetzner.

**Known debts carried from the spike into Part B:**
1. Test env currently points at the dev Supabase DB; set up a local Postgres test DB in Rs1 so Minitest can run tenancy isolation automatically.
2. Pay's shipped `AddPayStiColumns` migration renames a just-created column and needs `safety_assured` to pass `strong_migrations`.

## `core-pro/` is reference-only

The Next.js-path boilerplate (`core-pro/`) is frozen after the Rails decision. Read it for product behavior; do not add features, do not port fixes back, do not depend on it from anything new.

That codebase's locked stack (documented here so a fresh session doesn't "helpfully modernize" it): Next.js 16 with middleware in `proxy.ts` (renamed in v16, not `middleware.ts`), React 19, Drizzle ORM (schema in `lib/db/schema/`, migrations in `supabase/migrations/`), Clerk native Third-Party Auth with Supabase (NOT the deprecated April 2025 JWT template flow — uses `accessToken` callback), `@dnd-kit` for DnD, `@react-pdf/renderer` for PDFs, `next-safe-action` for Server Actions, Trigger.dev v4, Stripe v22 (`new Stripe(key)` required), `zod@4` with `zod/mini` in client bundles.

## Supabase BYPASSRLS gotcha — mandatory for any RLS table

In Supabase Postgres, the `postgres` role that Rails connects as has `rolbypassrls = true`. RLS policies (even with `FORCE ROW LEVEL SECURITY`) are **silently ignored** on queries that run as that role. Without mitigation, RLS is a no-op in dev — it looks like it's working, it isn't.

The pattern in `nucleus-rails-spike/app/models/application_record.rb` (`with_tenant_setting`):
- Open a transaction (`SET LOCAL` requires one).
- `SELECT set_config('app.professional_id', $1, true)` — bind param, no SQL interpolation.
- `SET LOCAL ROLE authenticated` — drops BYPASSRLS for the request body.
- Transaction end auto-resets both. No connection-checkin cleanup needed.

**Role choice:** Supabase pre-grants full CRUD on public tables to `anon`, `authenticated`, and `service_role`. `service_role` also has BYPASSRLS, so use `authenticated` (or create a dedicated app role). Migrations still run as `postgres` so DDL works.

**Fail-closed check:** `NULLIF(current_setting('app.professional_id', true), '')::uuid` evaluates to NULL when unset, which fails the policy's equality check and blocks all rows.

**How to apply:** Any Rails session that adds an RLS-protected table on Supabase must wrap request-path queries in `ApplicationRecord.with_tenant_setting` (or equivalent). Verify with an integration test (see `bin/verify_tenancy` for the live-DB equivalent) that inserts cross-tenant rows and asserts they're not visible. Never assume RLS "just works" in Supabase dev — BYPASSRLS roles make it a trap.
