# CorePro — Session 25 Readiness Report

> **Generated:** 2026-04-17 | **Purpose:** Complete setup guide and gap analysis before the final E2E testing session.
> This document covers: (1) every API key and credential to configure manually, (2) critical bugs blocking tests, (3) implementation gaps versus the plan, and (4) pre-production fixes needed.

---

## Table of Contents

1. [Critical Blockers — Fix Before Anything Else](#1-critical-blockers)
2. [API Keys & External Service Configuration](#2-api-keys--external-service-configuration)
3. [Implementation Status by Session](#3-implementation-status-by-session)
4. [Database & Infrastructure Issues](#4-database--infrastructure-issues)
5. [Security Gaps](#5-security-gaps)
6. [Trigger.dev Configuration](#6-triggerdev-configuration)
7. [PWA Gaps](#7-pwa-gaps)
8. [E2E Testing Setup (Session 25)](#8-e2e-testing-setup-session-25)
9. [Niche Specialization Checklist (FitCore / EstateCore)](#9-niche-specialization-checklist)

---

## 1. Critical Blockers

These must be resolved before Session 25 E2E testing begins. Many will cause silent or hard failures during test runs.

| # | Severity | Issue | Location | Fix |
|---|----------|-------|----------|-----|
| 1 | 🔴 CRITICAL | **No Playwright infrastructure** — zero test files, no playwright.config.ts, no `test` script | `package.json` | `npm install -D @playwright/test && npx playwright install` |
| 2 | 🔴 CRITICAL | **`trigger.config.ts` missing** — Trigger.dev v4 CLI/deploy will error without it | project root | Create file (see §6) |
| 3 | 🔴 CRITICAL | **`public/icons/` directory missing** — PWA not installable, manifest.ts references `icon-192.png`, `icon-512.png`, `maskable-512.png` | `public/` | Create icons with any PWA icon generator |
| 4 | 🔴 CRITICAL | **Invoice PDF generation not implemented** — `@react-pdf/renderer` is installed but NEVER imported; `generateInvoicePDF` action does not exist; Session 15 PDF deliverable is entirely absent | `lib/actions/invoices.ts` | Implement `generateInvoicePDF` using `@react-pdf/renderer` |
| 5 | 🔴 CRITICAL | **`services` table missing anon SELECT policy** — micro-site service listings return empty for unauthenticated visitors | `lib/db/schema/services.ts` | Add `pgPolicy` with `to: [anonRole]` for `is_active = true` |
| 6 | 🔴 CRITICAL | **`lead_magnet_downloads` missing anon INSERT policy** — public micro-site download flow fails for unauthenticated visitors | `lib/db/schema/marketing.ts` | Add anon INSERT policy OR route through `dbAdmin` server action |
| 7 | 🟠 HIGH | **`publicFormRateLimit` defined but never wired** — micro-site contact form and booking widget have no rate limiting | `lib/ratelimit/index.ts` | Apply in proxy.ts matcher or in the public actions |
| 8 | 🟠 HIGH | **Services CRUD is a stub** — `dashboard/services/page.tsx` shows "Coming soon"; no `createService`/`updateService` actions; blocks booking widget, micro-site services section, invoice line items | `app/dashboard/services/` | Implement services CRUD (affects Sessions 11, 15, 16) |
| 9 | 🟠 HIGH | **`next.config.ts` remotePatterns is empty** — Supabase Storage and Clerk avatar URLs are blocked by Next.js Image Optimization in production | `next.config.ts` | Add Supabase URL and Clerk CDN to `remotePatterns` |
| 10 | 🟠 HIGH | **`lib/supabase/middleware.ts` is a dead stub** — `export {}` with TODO comment; referenced nowhere | `lib/supabase/middleware.ts` | Either implement or delete the file to avoid confusing niche developers |
| 11 | 🟡 MEDIUM | **`types/database.ts` is a stub** — `export {}` placeholder; generated Supabase types not present | `types/database.ts` | Run `supabase gen types typescript --local > types/database.ts` after migrations |
| 12 | 🟡 MEDIUM | **Incremental migration `updated_at` trigger gap** — `9903_triggers.sql` only runs on `db reset`; session-15 and session-17 migrations that add `updated_at` columns will miss triggers on live DBs using `db push` | `supabase/migrations/` | Append explicit `CREATE TRIGGER` statements to `invoices_session15.sql` and `marketing_session17.sql` |
| 13 | 🟡 MEDIUM | **`web-push` npm package not in package.json** — `lib/notifications/push.ts` uses a dynamic import that may fail silently; VAPID key generation also requires it | `package.json` | `npm install web-push` + `npm install -D @types/web-push` |
| 14 | 🟡 MEDIUM | **Marketing landing page is Next.js default** — `app/(marketing)/page.tsx` still shows the framework default template | `app/(marketing)/page.tsx` | Implement landing page or at minimum a redirect to `/dashboard` |

---

## 2. API Keys & External Service Configuration

### Setup Order (Dependencies Matter)

```
1. Supabase project         (DB URL needed for all other services)
2. Clerk                    (auth, then enable TP Auth in Supabase)
3. Stripe                   (create products/prices, then webhook)
4. Resend                   (verify domain DNS before testing email)
5. Upstash Redis             (create DB, get REST URL)
6. Trigger.dev               (after creating trigger.config.ts)
7. Sentry                   (optional, last — add source maps last)
8. PostHog                  (optional, can set up anytime)
9. Web Push VAPID            (generate keypair, see below)
```

---

### 2.1 Supabase

| Env Var | Format | Where to Find |
|---------|--------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` | Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Long JWT string | Dashboard → Settings → API → anon public |
| `DATABASE_URL` | `postgresql://postgres.xxx:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true` | Dashboard → Settings → Database → Connection string → Transaction pooler |
| `DATABASE_URL_SERVICE_ROLE` | `postgresql://postgres:password@db.<ref>.supabase.co:5432/postgres` | Dashboard → Settings → Database → Connection string → **Direct** (NOT pooler) |

**⚠️ Critical:** `DATABASE_URL_SERVICE_ROLE` MUST use the **direct** (non-pooled) connection. The service-role client bypasses RLS — it must not go through PgBouncer for SET ROLE to work correctly.

**Dashboard Configuration Steps:**
1. Create a new Supabase project (choose EU region for GDPR compliance).
2. Go to **Authentication → Providers → Third-Party → Clerk** and enable it. Enter your Clerk **Frontend API URL** (e.g., `https://your-clerk-domain.clerk.accounts.dev`). This is the single most critical step — without it, all RLS policies that reference `auth.jwt()` will fail silently.
3. Run migrations: `npx supabase db push` or `npx supabase db reset` (local).
4. Confirm Storage buckets `avatars`, `documents`, `media`, `marketing` exist after migrations.
5. Confirm Realtime is publishing `messages`, `conversations`, `notifications`, `leads`.

---

### 2.2 Clerk

| Env Var | Format | Where to Find |
|---------|--------|---------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` or `pk_live_...` | Clerk Dashboard → API Keys |
| `CLERK_SECRET_KEY` | `sk_test_...` or `sk_live_...` | Clerk Dashboard → API Keys |
| `CLERK_WEBHOOK_SECRET` | `whsec_...` | Clerk Dashboard → Webhooks → Endpoint → Signing Secret |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | Hardcoded in app |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` | Hardcoded in app |

**Dashboard Configuration Steps:**
1. Create a new Clerk application.
2. Enable **Organizations** in Clerk Dashboard → Organizations → Settings. This is required for the multi-tenant model.
3. Create a **Webhook endpoint** at `https://yourdomain.com/api/webhooks/clerk`. Subscribe to these events:
   - `user.created`, `user.updated`, `user.deleted`
   - `organization.created`
   - `organizationMembership.created`, `organizationMembership.deleted`
4. Copy the **Signing Secret** into `CLERK_WEBHOOK_SECRET`.
5. Go to **Sessions → Customize session token** and add `org_id` to the JWT claims if not already present.

**⚠️ Do NOT use the deprecated JWT template flow.** The app uses Clerk's native Third-Party Auth (`accessToken` callback in supabase clients). The JWT template approach was deprecated April 2025.

---

### 2.3 Stripe

| Env Var | Format | Where to Find |
|---------|--------|---------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` or `pk_live_...` | Stripe Dashboard → Developers → API Keys |
| `STRIPE_SECRET_KEY` | `sk_test_...` or `sk_live_...` | Stripe Dashboard → Developers → API Keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe Dashboard → Webhooks → Endpoint → Signing Secret |
| `STRIPE_STARTER_PRICE_ID` | `price_...` | Create in Stripe → Products |
| `STRIPE_GROWTH_PRICE_ID` | `price_...` | Create in Stripe → Products |
| `STRIPE_PRO_PRICE_ID` | `price_...` | Create in Stripe → Products |

**Dashboard Configuration Steps:**
1. Create 3 Products in Stripe with monthly recurring prices:
   - **Starter** — EUR 29/month
   - **Growth** — EUR 59/month
   - **Pro** — EUR 99/month
2. Copy each `price_xxx` ID into the corresponding env var.
3. Create a **Webhook endpoint** at `https://yourdomain.com/api/webhooks/stripe`. Subscribe to:
   - `checkout.session.completed`
   - `customer.subscription.created`, `.updated`, `.deleted`
   - `invoice.payment_failed`
4. Enable **Customer Portal** in Stripe Dashboard → Billing → Customer Portal → Activate.
5. For local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` — this generates a local `STRIPE_WEBHOOK_SECRET`.

**⚠️ `stripe@22` breaking change:** The Stripe SDK v22 requires `new Stripe(key)` — already used correctly in `lib/stripe/client.ts`.

---

### 2.4 Resend

| Env Var | Format | Where to Find |
|---------|--------|---------------|
| `RESEND_API_KEY` | `re_...` | Resend Dashboard → API Keys |
| `RESEND_FROM_EMAIL` | `noreply@yourdomain.com` | Must be from a verified domain |

**Dashboard Configuration Steps:**
1. Create a Resend account and add your domain.
2. Add the DNS records (SPF, DKIM, DMARC) provided by Resend — can take up to 48h to verify.
3. Create an API key with **Send emails** permission.
4. Update `RESEND_FROM_EMAIL` to use your verified domain (not `@resend.dev` in production).

---

### 2.5 Upstash Redis

| Env Var | Format | Where to Find |
|---------|--------|---------------|
| `UPSTASH_REDIS_REST_URL` | `https://....upstash.io` | Upstash Dashboard → Database → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | Long token string | Upstash Dashboard → Database → REST API |

**Notes:**
- Create a Global database for lowest latency across edge regions.
- All 5 rate limiters (`authRateLimit`, `webhookRateLimit`, `publicFormRateLimit`, `apiRateLimit`, `healthRateLimit`) silently degrade to no-ops when these vars are absent — you will have **no rate limiting in production** without them.
- Consider a separate Upstash DB for production vs staging.

---

### 2.6 Trigger.dev

| Env Var | Format | Where to Find |
|---------|--------|---------------|
| `TRIGGER_SECRET_KEY` | `tr_dev_...` or `tr_prod_...` | Trigger.dev Dashboard → Project → API Keys |

**Dashboard Configuration Steps:**
1. Create a project in [Trigger.dev Cloud](https://cloud.trigger.dev).
2. Copy the **Project Ref** (e.g., `proj_abc123`) for use in `trigger.config.ts`.
3. After first deploy, **activate cron schedules** for `inactive-client-checker` (daily 09:30 UTC) and `invoices.overdue-sweep` (daily 09:00 UTC) — defined in code but must be attached once in the dashboard.
4. Set these env vars in the Trigger.dev project settings (they run in an isolated Node worker):
   - `DATABASE_URL` (use the **direct** Supabase connection string, not pooler)
   - `RESEND_API_KEY`
   - `SENTRY_DSN`
   - `NEXT_PUBLIC_APP_URL`

**⚠️ Must create `trigger.config.ts` at project root:**
```typescript
import { defineConfig } from "@trigger.dev/sdk/v3"

export default defineConfig({
  project: "<YOUR_TRIGGER_PROJECT_REF>",
  dirs: ["./trigger/jobs"],
})
```

---

### 2.7 Sentry

| Env Var | Format | Where to Find |
|---------|--------|---------------|
| `SENTRY_DSN` | `https://xxx@oyyy.ingest.sentry.io/zzz` | Sentry → Project → Settings → Client Keys |
| `NEXT_PUBLIC_SENTRY_DSN` | Same as above | Same (must be public for browser SDK) |
| `SENTRY_AUTH_TOKEN` | Long token | Sentry → Settings → Auth Tokens (source map upload) |
| `SENTRY_ORG` | Your org slug | Sentry → Settings → Organization |
| `SENTRY_PROJECT` | Your project slug | Sentry → Project → Settings |

**Notes:**
- `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` should have **the same value**.
- `SENTRY_AUTH_TOKEN` is only needed at build time (CI/CD) for source map upload — not at runtime.
- The tunnel route `/monitoring` is configured in `next.config.ts` to bypass ad blockers.
- PII scrubbing is already implemented in `lib/sentry/pii-filter.ts` — email, phone, client names are scrubbed.

---

### 2.8 PostHog

| Env Var | Format | Where to Find |
|---------|--------|---------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | `phc_...` | PostHog → Project → Settings → Project API Key |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://eu.i.posthog.com` | Use EU cloud for GDPR compliance |

**Notes:**
- Session replay is set to `replaysSessionSampleRate: 0.0` (off by default) — requires explicit opt-in per GDPR cookie consent. Enable after implementing consent banner.
- Feature flags (`ai_features`, `advanced_automations`, `white_label`, `new_ui_*`) must be created in the PostHog dashboard to be evaluable.

---

### 2.9 Web Push (VAPID Keys)

| Env Var | Format | Source |
|---------|--------|--------|
| `VAPID_PUBLIC_KEY` | Base64url string | Generate with `web-push` CLI |
| `VAPID_PRIVATE_KEY` | Base64url string | Generate with `web-push` CLI |
| `VAPID_SUBJECT` | `mailto:support@yourdomain.com` | Your support email |

**⚠️ `web-push` package is missing from `package.json` — install it first:**
```bash
npm install web-push
npm install -D @types/web-push
```

**Generate VAPID keypair:**
```bash
npx web-push generate-vapid-keys
```
Copy the output into your `.env.local`. The public key is served from `api/push/vapid-public-key/route.ts` to the browser.

---

### 2.10 App URL

| Env Var | Format | Example |
|---------|--------|---------|
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.com` | `http://localhost:3000` locally |

This is used by Stripe for Checkout redirect URLs, Clerk for OAuth callbacks, and email templates for links. Wrong value in production will redirect users to the wrong domain after payment.

---

### 2.11 CRON Secret

| Env Var | Format | Source |
|---------|--------|--------|
| `CRON_SECRET` | Any strong random string | Generate: `openssl rand -hex 32` |

Used to authenticate calls to `/api/cron/invoices-overdue` from Vercel Cron or an external scheduler. If unset, the cron route is only accessible in non-production environments.

---

### 2.12 Complete `.env.local` Checklist

```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_URL=                        # Transaction pooler URL (with ?pgbouncer=true)
DATABASE_URL_SERVICE_ROLE=           # DIRECT connection URL (NOT pooler)

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=                # Required — sync to DB will not work without it

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STARTER_PRICE_ID=
STRIPE_GROWTH_PRICE_ID=
STRIPE_PRO_PRICE_ID=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Upstash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Trigger.dev
TRIGGER_SECRET_KEY=

# Sentry
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=              # Same as SENTRY_DSN
SENTRY_AUTH_TOKEN=                   # Build-time only
SENTRY_ORG=
SENTRY_PROJECT=

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com

# Web Push
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:support@yourdomain.com

# Cron
CRON_SECRET=
```

---

## 3. Implementation Status by Session

| Session | Status | Key Gap / Notes |
|---------|--------|-----------------|
| 1 — Scaffolding | ✅ Complete | All deps correct (Next.js 16, React 19, stripe@22, dnd-kit, trigger.dev@4) |
| 1.5 — Observability | ✅ Complete | Sentry, Upstash, error boundaries, health check all wired |
| 2 — Schema & Migrations | ⚠️ Partial | `types/database.ts` is a stub; otherwise schema + migrations complete |
| 3 — DB Clients & Queries | ✅ Complete | `withRLS`, `dbAdmin`, all query helpers, `authedAction`/`publicAction` correct |
| 4 — Clerk Auth | ⚠️ Partial | `lib/supabase/middleware.ts` is dead stub (delete or implement) |
| 5 — Stripe | ✅ Complete | Plans, webhooks, Customer Portal, hooks, billing page all present |
| 6 — Dashboard Shell | ✅ Complete | Sidebar, topbar, mobile-nav, breadcrumbs, branding CSS vars |
| 7 — Portal Shell | ✅ Complete | Branded portal, all nav items, branding API route |
| 8 — Client CRM | ✅ Complete | DataTable, 8-tab profile, tag system, bulk actions, plan limits |
| 9 — Lead Pipeline | ✅ Complete | dnd-kit Kanban, stage management, activity logging, convert-to-client |
| 10 — Real-Time Messaging | ✅ Complete | Supabase Realtime, both dashboard + portal views, file sharing |
| 11 — Calendar & Scheduling | ✅ Complete | Booking widget, iCal export, Trigger.dev reminders (v4 API correct) |
| 12 — Form Builder | ✅ Complete | dnd-kit builder, portal renderer, pre-built templates |
| 13 — Document Management | ✅ Complete | Supabase Storage, pre-signed URLs, storage limit enforcement |
| 14 — Notifications | ✅ Complete | In-app, email, push; preferences; quiet hours; real-time |
| 15 — Invoice Tracking | ⚠️ Partial | **PDF generation entirely absent** despite `@react-pdf/renderer` installed |
| 16 — Micro-Site Builder | ✅ Complete | 5 themes, SSG, OG image, sitemap, robots, contact-form → lead |
| 17 — Marketing Kit | ✅ Complete | Email campaigns, social templates (Canvas), lead magnets |
| 18 — Automations | ✅ Complete | Engine, Trigger.dev v4 jobs with `wait.for()`, pre-built templates, logs |
| 19 — Analytics | ✅ Complete | KPI cards, 4 chart types, date range, CSV/PDF export, activity feed |
| 20 — Settings & GDPR | ✅ Complete | All 9 sub-pages, GDPR export/delete, cookie banner, team management |
| 21 — Email Templates | ✅ Complete | 11 templates + branded shell, preview route, Resend per-plan limits |
| 22 — i18n | ⚠️ Partial | `en.json` + `ro.json` structurally complete but ~40% of components use hardcoded strings; email templates not localized |
| 23 — PostHog & Flags | ✅ Complete | Events, feature flags, plan+flag combined gate, session replay opt-in |
| 24 — PWA | ⚠️ Partial | `manifest.ts` and `sw.js` complete; **`public/icons/` missing** → not installable |
| 25 — E2E Testing | ❌ Missing | Zero test infrastructure — entire session deliverable not started |

**Score: 18 complete / 5 partial / 1 missing (+ 1 unplanned gap: Services CRUD)**

---

## 4. Database & Infrastructure Issues

### 4.1 RLS Policy Bugs

**Bug 1: `services` — Missing `anon` SELECT**
Micro-site visitors are unauthenticated. The services section on any published micro-site will return an empty list because the current policy only grants SELECT to `authenticated` role.

```typescript
// Add to lib/db/schema/services.ts
pgPolicy("services_public_select", {
  for: "select",
  to: [anonRole, authenticatedRole],
  using: sql`${t.isActive} = true`,
}),
```

**Bug 2: `lead_magnet_downloads` — Missing `anon` INSERT**
Public download form creates a row before any auth. Either add an anon INSERT policy or route through a `publicAction` that uses `dbAdmin`.

### 4.2 Incremental Migration Risk

`9903_triggers.sql` dynamically attaches `updated_at` triggers to all tables with that column at migration time. On fresh `db reset` this works perfectly. On a live database using incremental `db push`, the session-15 and session-17 migrations add `updated_at` columns to new tables **without re-running `9903`**. Those triggers will be silently missing.

**Fix:** Add explicit trigger creation at the end of:
- `20260416230137_invoices_session15.sql`: for `invoices`, `invoice_settings`
- `20260416234300_marketing_session17.sql`: for `email_campaigns`, `social_templates`, `lead_magnets`

### 4.3 Seed Data Gaps

Current `seed.sql` covers: 1 professional, 3 clients, 5 lead stages, 3 tags, 3 services.

Missing for E2E testing:
- `professional_settings` row (required for settings page, branding)
- `micro_sites` row (required for micro-site builder and public page test)
- `appointments` row (required for calendar and reminder scheduling test)
- `invoices` + `invoice_settings` rows (required for invoice flow test)
- `forms` + `form_assignments` rows (required for form assign + submit test)

### 4.4 `next.config.ts` Remote Patterns (Must Fix)

All `next/image` calls for Supabase Storage and Clerk avatars will fail in production with a "hostname not configured" error.

```typescript
// next.config.ts — add to images.remotePatterns:
{
  protocol: "https",
  hostname: "*.supabase.co",       // Supabase Storage
  pathname: "/storage/v1/object/**",
},
{
  protocol: "https",
  hostname: "img.clerk.com",       // Clerk avatars
},
{
  protocol: "https",
  hostname: "images.clerk.dev",    // Clerk dev avatars
},
```

### 4.5 Missing Indexes (Performance)

Add before production load testing:

```sql
CREATE INDEX IF NOT EXISTS idx_leads_converted_client_id ON leads(converted_client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_appointment_id ON invoices(appointment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_service_id ON invoices(service_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_assignment_id ON form_responses(assignment_id);
```

---

## 5. Security Gaps

### 5.1 Rate Limiting Gaps

| Endpoint | Current Limiting | Required |
|----------|-----------------|----------|
| Micro-site contact form | ❌ None | `publicFormRateLimit` (3/min per IP+slug) |
| Booking widget | ❌ None | `publicFormRateLimit` |
| GDPR export | `apiRateLimit` (60/min) | Dedicated 5/hour per user |
| GDPR delete | `apiRateLimit` (60/min) | Dedicated 5/hour per user |
| `/api/billing/*` | Not verified | Confirm auth check in handler |
| `/api/push/*` | Not verified | Confirm auth check in handler |

### 5.2 Share Target Route

`/api/share-target/route.ts` handles PWA share target uploads. File type and size validation before Supabase Storage upload **must be confirmed** before production. Any unvalidated file type could be uploaded.

### 5.3 Webhook Verification

Both webhooks are correctly implemented:
- **Clerk:** Uses `verifyWebhook()` from `@clerk/nextjs/webhooks` (Svix). Returns 400 on invalid signature. ✅
- **Stripe:** Uses `constructEventAsync()` with raw body via `req.text()`. Returns 400 on missing/invalid signature. ✅

---

## 6. Trigger.dev Configuration

### Must Do

1. **Create `trigger.config.ts` at `core-pro/` root:**
```typescript
import { defineConfig } from "@trigger.dev/sdk/v3"

export default defineConfig({
  project: "<YOUR_TRIGGER_PROJECT_REF>",
  dirs: ["./trigger/jobs"],
})
```

2. **Set env vars in Trigger.dev project dashboard** (these run in an isolated Node.js worker, not Next.js):
   - `DATABASE_URL` → use **direct** (non-pooled) Supabase connection string
   - `RESEND_API_KEY`
   - `SENTRY_DSN`
   - `NEXT_PUBLIC_APP_URL`

3. **After first `npx trigger.dev@latest deploy`, activate the two cron schedules** in the dashboard:
   - `automations.inactive-client-checker` → `30 9 * * *` (daily 09:30 UTC)
   - `invoices.overdue-sweep` → `0 9 * * *` (daily 09:00 UTC)

4. **Fix `lib/triggers/index.ts`** — currently only exports a type. Add task re-exports so callers use typed references instead of magic strings:
```typescript
export { runAutomationChainTask } from "@/trigger/jobs/automation-runner"
export { sendAppointmentReminderTask } from "@/trigger/jobs/appointments"
export { inactiveClientCheckerTask } from "@/trigger/jobs/inactive-client-checker"
export { invoiceOverdueSweep } from "@/trigger/jobs/invoices"
```

5. **Investigate `"server-only"` import in `lib/automations/engine.ts`** — Trigger.dev bundles run in Node.js, not Next.js. If the bundler doesn't strip this import the tasks will crash on startup. Test with `npx trigger.dev@latest dev` locally.

### All Jobs Use v4 API Correctly ✅
- `automation-runner.ts` → `task()` with `wait.for({ days: N })` ✅
- `inactive-client-checker.ts` → `schedules.task()` with cron ✅
- `appointments.ts` → `task()` ✅
- `invoices.ts` → `schedules.task()` ✅
- All use `dbAdmin` (no `withRLS`) ✅

---

## 7. PWA Gaps

### Must Fix for Installability

1. **Create `public/icons/` directory with three PNG files:**
   - `icon-192.png` — 192×192 PNG (any icon, even a colored square)
   - `icon-512.png` — 512×512 PNG
   - `maskable-512.png` — 512×512 PNG with ~20% safe zone padding for maskable display
   - Quick generation: use [maskable.app](https://maskable.app) or [realfavicongenerator.net](https://realfavicongenerator.net)

2. **Add theme-color meta tag to root layout** (`app/layout.tsx`):
```tsx
<meta name="theme-color" content="#ffffff" />
```

3. **Verify SW registration exists** in `app/layout.tsx` or a `PwaProvider` component. The SW file `public/sw.js` is complete but registration code must exist client-side.

### Status After Fixes
Estimated Lighthouse PWA score: **90+/100** once icons, theme-color, and SW registration are confirmed.

---

## 8. E2E Testing Setup (Session 25)

### Prerequisites

```bash
# 1. Install Playwright
npm install -D @playwright/test
npx playwright install chromium webkit

# 2. Create playwright.config.ts
# 3. Create tests/ directory with subdirs
# 4. Create test fixtures for Clerk auth state
```

### Recommended Test Structure

```
tests/
├── fixtures/
│   └── auth.setup.ts          # Persist Clerk session cookies
├── e2e/
│   ├── auth.spec.ts           # Sign-up, sign-in, role routing
│   ├── clients.spec.ts        # CRM CRUD, tags, profile tabs
│   ├── leads.spec.ts          # Kanban, drag & drop, convert
│   ├── messages.spec.ts       # Send, receive, real-time badge
│   ├── appointments.spec.ts   # Calendar, booking widget
│   ├── forms.spec.ts          # Build, assign, fill, submit
│   ├── invoices.spec.ts       # Create, mark paid, PDF
│   ├── micro-site.spec.ts     # Publish, render, contact → lead
│   └── stripe.spec.ts         # Checkout, webhook, plan limits
├── .auth/                     # Gitignored session storage
└── playwright.config.ts
```

### Manual Setup for E2E Tests

| What | How |
|------|-----|
| Stripe test mode | Use `sk_test_` keys + `stripe listen --forward-to localhost:3000/api/webhooks/stripe` |
| Clerk test users | Create `pro@test.corepro.app` (professional) and `client@test.corepro.app` (client) in Clerk dev dashboard |
| Local Supabase | `npx supabase start` + `npx supabase db reset` (loads seed data) |
| Upstash in test | Set `NODE_ENV=test` or leave blank to disable rate limiting |
| Resend in test | Use Resend sandbox (emails go to dashboard, not real inboxes) |

### 10 Critical Flows to Prove Boilerplate Works

| # | Flow | Tests |
|---|------|-------|
| 1 | **Professional signup → DB sync** | Sign up → Clerk webhook fires → `professionals` row created → dashboard loads |
| 2 | **Client invitation → portal access** | Pro invites email → client creates account → portal renders with professional's branding |
| 3 | **Stripe subscription** | Click Upgrade → Checkout → test card → webhook → `professionals.plan` = `pro` |
| 4 | **Appointment booking + reminder** | Create appointment → Trigger.dev task enqueued (no error) |
| 5 | **Invoice full lifecycle** | Create → send email → client views in portal → mark paid |
| 6 | **Form assign + submit** | Pro assigns form → client submits → `formAssignment.status` = `completed` |
| 7 | **Automation: new_client trigger** | Create automation → invite client → `automation_logs` row = `completed` |
| 8 | **Micro-site contact form → lead** | Publish micro-site → submit contact form → lead appears in pipeline |
| 9 | **GDPR export** | `GET /api/gdpr/export/[id]` → 200 with all data sections |
| 10 | **GDPR delete** | `POST /api/gdpr/delete/[id]` → client row gone + storage cleaned + Clerk user deleted |

---

## 9. Niche Specialization Checklist

When forking this boilerplate for **FitCore Pro** (fitness coaches) or **EstateCore Pro** (real estate agents), these are the extension points to implement:

### Database

- [ ] Add niche tables in `lib/db/schema/_niche.ts` with `professional_id` FK and RLS policies
- [ ] Number niche migrations `100_*.sql`, `101_*.sql`, etc.
- [ ] Add niche-specific seed data to `supabase/seed.sql`
- [ ] Add tables to Realtime publication if needed

### FitCore Pro specific tables
`programs`, `program_phases`, `workouts`, `workout_exercises`, `exercises`, `meal_plans`, `meals`, `meal_items`, `foods`, `progress_entries`, `progress_photos`, `wellness_logs`

### EstateCore Pro specific tables
`properties`, `property_photos`, `property_rooms`, `exclusive_contracts`, `contract_activities`, `transactions`, `transaction_stages`, `viewings`, `viewing_feedback`, `offers`, `cma_reports`, `cma_comparables`, `commission_records`, `buyer_search_profiles`

### Application

- [ ] Add niche navigation items to `components/dashboard/nav-items.ts`
- [ ] Create pages under `app/dashboard/_niche/`
- [ ] Add portal niche pages under `app/portal/_niche/`
- [ ] Add micro-site niche sections under `app/[slug]/_niche/`
- [ ] Add niche server actions in `lib/actions/niche/`
- [ ] Add niche domain types to `types/domain.ts`
- [ ] Add niche translation keys to `messages/en.json` and `messages/ro.json`

### PostHog

- [ ] Add niche-specific feature flags in PostHog dashboard
- [ ] Add niche event tracking calls in `lib/posthog/events.ts`

### Stripe (optional per niche)

- [ ] Adjust plan limits in `lib/stripe/plans.ts` (e.g., EstateCore uses `max_listings` instead of `max_clients`)

---

## Quick-Start Verification Commands

Run these after completing setup to verify the boilerplate is working:

```bash
# 1. TypeScript — must pass with zero errors
npm run build

# 2. Lint
npm run lint

# 3. Drizzle schema — must produce no diff (schema matches migrations)
npx drizzle-kit generate --check

# 4. Local DB — must apply all 11 migrations + seed cleanly
npx supabase start
npx supabase db reset

# 5. DB lint
npx supabase db lint

# 6. Health check — must return { status: "healthy" }
curl http://localhost:3000/api/health

# 7. Trigger.dev local dev (requires trigger.config.ts)
npx trigger.dev@latest dev

# 8. E2E tests (after Session 25 setup)
npx playwright test
```

---

*Document produced by parallel codebase analysis. Cross-reference with `nucleus-Implementation-Plan.md` Session 25 deliverables for the complete verification checklist.*
