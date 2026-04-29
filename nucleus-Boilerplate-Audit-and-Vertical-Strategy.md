# CorePro / Nucleus — Boilerplate Audit & Vertical Strategy

**Date:** 2026-04-29
**Source plan audited against:** `nucleus-Implementation-Plan.md` (v1.1, April 2026, 25 sessions)
**Codebase audited:** `core-pro/` on branch `next-fix`
**Method:** 4 parallel exploration agents, one per session cluster, each spot-checking files/grep matches against plan deliverables.

---

## 1. Headline

**Every one of the 25 plan sessions is implemented.** Nothing is fully MISSING. The remaining work is small refinements plus one client-facing surface that was overlooked. The boilerplate phase is, in substance, complete.

| Cluster | Sessions | Status |
|---|---|---|
| Foundation & infra (scaffolding, Drizzle/RLS, Clerk TPA, Stripe, PostHog, PWA) | 1, 1.5, 2, 3, 4, 5, 23, 24 | DONE |
| CRM core (dashboard shell, portal shell, clients, leads kanban, messaging, calendar) | 6–11 | DONE |
| Productivity (forms, documents, notifications, invoices, micro-site, marketing kit) | 12–17 | DONE except portal-side invoices |
| Cross-cutting (automations, analytics, settings/GDPR, email, i18n, E2E) | 18–22, 25 | DONE |

### Intentional deviations from the plan (not gaps)

- **Sentry removed** — errors flow through native logging per `CLAUDE.md` (decision 2026-04-25).
- **Next 16 → 15.5 LTS** — downgraded over the RSC rapid-refresh race (`feedback_next16_rsc_rapid_refresh.md`). `middleware.ts`, not `proxy.ts`.
- **Portal auth decoupled from Clerk** — custom magic-link + cookie session in `lib/portal-auth/` (decision 2026-04-26). Clerk stays for agents only.
- **`FEATURE_GATING_ENABLED = false`** in `lib/stripe/plans.ts` — every plan/feature gate is a no-op until verticals ship. Flip the constant when going vertical.

---

## 2. Per-session findings

### Foundation & infra (Sessions 1, 1.5, 2, 3, 4, 5, 23, 24)

- **Session 1 — Scaffolding:** DONE. Folder structure, tsconfig aliases (`@/*`, `@/components/*`, `@/lib/*`, `@/hooks/*`, `@/types/*`, `@/db/*`), `drizzle.config.ts` writes to `supabase/migrations/`, `middleware.ts` wires `clerkMiddleware` with `createRouteMatcher`, Tailwind v4 `@theme inline` in `app/globals.css`.
- **Session 1.5 — Observability & ratelimit:** DONE. All four ratelimiters in `lib/ratelimit/index.ts` (`authRateLimit` 5/min, `webhookRateLimit` 100/s, `publicFormRateLimit` 3/min, `apiRateLimit` 60/min). `app/error.tsx` + `app/global-error.tsx`. `api/health/route.ts` checks Postgres + Redis. PostHog gated by `CONSENT_COOKIE`, `respect_dnt: true`.
- **Session 2 — Drizzle schema + RLS:** DONE. 17 schema files in `lib/db/schema/`, `pgPolicy` / `authenticatedRole` across all tables, hand-written `0000_extensions.sql` + `0001_functions.sql`, 18 migration files.
- **Session 3 — RLS helper + queries:** DONE. `withRLS` in `lib/db/rls.ts` populates `request.jwt.claims` GUC + `SET LOCAL ROLE authenticated`. `dbAdmin` in `lib/db/client.ts`. Supabase client uses Clerk **native Third-Party Auth** via `accessToken` callback (not deprecated JWT template). 18 typed query modules in `lib/db/queries/`.
- **Session 4 — Clerk auth:** DONE. Sign-in/up at `app/(auth)/`, middleware role-routes via `auth.protect()`, webhook at `api/webhooks/clerk/route.ts`, `hooks/use-professional.ts` + `hooks/use-user-role.ts`, `lib/clerk/helpers.ts` exports `syncUserToSupabase`/`deleteProfessionalByClerkId`/`linkProfessionalToOrg`.
- **Session 5 — Stripe:** DONE. Plans in `lib/stripe/plans.ts` (gating off), webhook at `api/webhooks/stripe/route.ts`, `hooks/use-subscription.ts`, pricing page, `app/dashboard/settings/billing/`, usage tracking in `lib/stripe/usage.ts`.
- **Session 23 — PostHog:** DONE. Client/server/events/flags modules; `posthog-provider.tsx` consent-gated; `posthog-identify.tsx`; `feature-flag.tsx`; session replay gated by separate `REPLAY_COOKIE`.
- **Session 24 — PWA:** DONE. `app/manifest.ts` (start_url `/dashboard`, shortcuts), `public/sw.js` (offline + bg sync + web push + precache), `app/offline/page.tsx`, `use-pull-to-refresh`, `use-swipe-actions`.

### CRM core (Sessions 6–11)

- **Session 6 — Dashboard shell:** DONE. `app/dashboard/layout.tsx` with sidebar + topbar + breadcrumbs + mobile bottom nav. Dynamic branding via CSS variables from `professional.branding`. All nav items present (Clients/Leads/Services/Calendar/Messages/Forms/Documents/Invoices/Automations/Marketing/Analytics/Site Builder/Settings + `_niche` divider). NotificationBell + Avatar menu in topbar.
- **Session 7 — Portal shell:** DONE. `app/portal/(authenticated)/layout.tsx` with branded header, top nav, mobile bottom nav. Branding fetched from public `api/branding/[professional_id]/route.ts`. `requirePortalSession()` validates `nucleus_portal` cookie with HMAC. `PortalSupabaseAuthProvider` for client-side realtime.
- **Session 8 — Clients CRUD + tabbed profile:** DONE. List with DataTable, filters, bulk actions. Profile tabs Overview/Details/Messages/Documents/Forms/Invoices/Notes (+ `_niche`). ActivityTimeline. Tag manager + `client_tags` junction. `max_clients` enforced in `lib/services/clients/create.ts:54-57`.
- **Session 9 — Lead pipeline:** DONE. `@dnd-kit` DndContext + columns/cards. Default stages seeded by `ensureDefaultStages()`. Server actions `createLead`/`moveLeadToStage`/`convertLeadToClient`/`addLeadActivity` in `lib/services/leads/`. Optimistic updates on drag.
- **Session 10 — Real-time messaging:** DONE. Two-pane inbox at `app/dashboard/messages/`, single-conversation portal view. `useMessages()` + `useConversations()` in `hooks/use-realtime.ts` via Supabase `postgres_changes` (INSERT + UPDATE for read_at). File/image attachments via Supabase Storage. Unread badge wired to sidebar via `useUnreadMessages`.
- **Session 11 — Calendar:** DONE. Day/week/month views with drag-to-reschedule. Availability table day_of_week/start_time/end_time. Email reminders via Trigger.dev `sendAppointmentReminderTask` at 24h/1h. iCal export at `api/calendar/[professional_id]/ical/route.ts` using `ics` package. `.ics` invite attachments via `appointmentToInvite` helper.

### Productivity (Sessions 12–17)

- **Session 12 — Form builder:** DONE. Drag-drop `FormBuilder` supporting all field types (short/long text, email, phone, number, single/multi-select, date, file, slider, signature, section). Templates in `lib/forms/templates.ts` (GDPR Consent, General Intake, NPS Survey, Weekly Check-in). Portal renderer with validation in `lib/forms/validate.ts`.
- **Session 13 — Documents:** DONE. Upload/categorize/filter/preview/download in dashboard, portal upload + download, integrated into client profile tab. Pre-signed URLs (60min hardcoded — known sharp edge). Storage policies mirror RLS.
- **Session 14 — Notifications:** DONE. Bell + dropdown + history page. `lib/notifications/send.ts` universal sender (in_app + email + push) honors preferences + quiet hours. React Email templates: notification, appointment-reminder, new-message, form-assigned. Web Push via `lib/notifications/push.ts`. Quiet-hours timezone-aware in `lib/notifications/preferences.ts`. Hooks: `useUnreadCount`/`useNotifications`/`markAsRead`/`markAllAsRead`.
- **Session 15 — Invoices:** DONE on dashboard side. List, filters, stat cards, builder dialog. PDF via `lib/invoices/pdf.tsx` (`@react-pdf/renderer`). Server actions `createInvoice`/`updateInvoice`/`deleteInvoice`/`generateInvoicePDF`/`sendInvoice`/`recordPayment`/`markInvoiceViewed`. **MISSING: portal-side invoices page.**
- **Session 16 — Micro-site builder:** DONE. Live preview + section editor with drag-reorder. All sections (Hero/About/Services/Testimonials/Contact/FAQ/Blog + `_niche`). Public render at `app/[slug]/page.tsx` with SSG/ISR (10min revalidate). OG images via `app/[slug]/opengraph-image.tsx`. JSON-LD, sitemap, robots.
- **Session 17 — Marketing kit:** DONE. Tabs Email Campaigns / Social Templates / Lead Magnets. Campaigns send via `lib/services/marketing/send-campaign.ts` → Trigger.dev `processCampaignSend` (with inline fallback for local dev). Social Canvas → PNG client-side export. Lead magnets gated by contact form, auto-create lead.

### Cross-cutting (Sessions 18–22, 25)

- **Session 18 — Automations:** DONE. `lib/automations/engine.ts` exports `evaluateTrigger` / `executeAction` / `processAutomationChain`. All 6 trigger types (`new_client`, `new_lead`, `form_submitted`, `appointment_completed`, `client_inactive`, `custom_date`). Trigger.dev v4 jobs `runAutomationChainTask` + scheduled `inactive-client-checker.ts` using `dbAdmin`. 4 pre-built templates.
- **Session 19 — Analytics:** DONE. Date range presets (week/month/quarter/year/custom), KPI cards, Recharts area/bar/funnel/pie. `getDashboardSummary(range)` etc. in `lib/analytics/queries.ts`. CSV + PDF (window.print) export. `NicheMetricsPlaceholder` slot present.
- **Session 20 — Settings/Branding/GDPR:** DONE. 9 tabs (Profile/Branding/Billing/Notifications/Calendar/Integrations/Team/GDPR/Danger Zone). Live branding preview. Team via Clerk Organizations. GDPR `api/gdpr/export/[client_id]` and `api/gdpr/delete/[client_id]`. Cookie banner with privacy-policy link in `components/micro-site/cookie-banner.tsx`.
- **Session 21 — Email templates:** DONE. 12 React Email templates in `emails/`. `TEMPLATES` registry in `lib/resend/templates.ts`. Per-plan rate-limited send via `lib/resend/client.ts`. Localized subjects via `makeEmailTranslator(locale)`. Auth-gated preview at `api/emails/preview/[template]/route.ts`.
- **Session 22 — i18n:** DONE. `next-intl` configured. `lib/i18n/request.ts` resolves locale via cookie → Accept-Language → default `ro`. `messages/en.json` + `messages/ro.json` with namespaces (common, dashboard, portal, micro_site, emails, validation, errors, locale). Locale switcher in settings + portal header. `setLocaleAction` updates cookie + persists for logged-in users.
- **Session 25 — E2E + polish:** DONE. 10 Playwright specs (~601 lines) — auth/clients/leads/messages/appointments/forms/invoices/micro-site/smoke/stripe. Skeleton loaders, empty states, 404/500 pages. Docs: `README.md`, `CONTRIBUTING.md`, `docs/niche-extension.md`, `docs/services-pattern.md`, `docs/services-extraction-plan.md`.

---

## 3. Punch list — close before tagging `v1.0-boilerplate`

Ordered by urgency. Total estimated effort: **1–2 working days**.

| # | Gap | Why it matters | Est. |
|---|---|---|---|
| 1 | Add `app/portal/(authenticated)/invoices/page.tsx` | Dashboard side and PDF generation exist; clients can't see their own invoices in the portal today. | 2–3h |
| 2 | Wire professional branding into live email sends | `lib/resend/client.ts` doesn't fetch `professional.branding` and pass to template renders. The preview route does — sends don't. Clients receive generic-looking email. | 1–2h |
| 3 | Replace post-Sentry `console.error` with a structured sink | `next-safe-action`'s `handleServerError` only logs to console after Sentry was removed. Pick one: a `lib/audit/log.ts` table, Vercel log drains, or Logtail. Going to paying customers without alerting is the gap, not Sentry's absence. | 1–2h |
| 4 | Document quota race in `uploadDocument` | No atomic check-and-deduct between concurrent uploads. Wrap in advisory lock or `UPDATE ... WHERE storage_used + ? <= limit RETURNING *`. Already on the known-sharp-edges memory. | 2h |
| 5 | Form response CSV export | `getFormResponses` exists but no export action. Verticals will hit this immediately (intake forms, viewing surveys). | 2h |

### Nice-to-have, non-blocking

- E2E specs for `automations.spec.ts` and `analytics.spec.ts` (the two domains without coverage).
- GDPR export streaming / size cap (`api/gdpr/export/[client_id]` returns 100MB+ JSON for large clients).
- Replace `logSocialExport` no-op stub with a real export-tracking insert.
- Root-level `instrumentation.ts` (Next 15.5 supports it; useful for OpenTelemetry later).
- Notification preferences UI completeness (per-type toggles, quiet-hours picker — backend honors these, UI may be partial).
- Continue services extraction (pilot was `clients` on 2026-04-25; automations/analytics still hold inline logic — see `docs/services-extraction-plan.md`).

---

## 4. Vertical strategy — Real Estate (exclusive representation mandate)

### 4.1 Recommended path: template + upstream-aware forks

The repo was designed for the template-and-fork model: `_niche/` folders + `docs/niche-extension.md` + `metadata jsonb` columns + `lib/services/<domain>/` boundary all exist precisely so vertical work doesn't touch core files. The `niche-extension` doc encodes one rule: **the core never imports from a `_niche/` folder** — and that rule is meaningful only if it's never violated, which means vertical code must live in a separate repo.

### 4.2 Step-by-step sequence

```
1. (1–2 days) Close the 5 must-fix gaps in §3 on `next-fix`.
2. Merge `next-fix` → `main`.
3. Tag `v1.0.0-boilerplate` on main (so verticals can pin a stable commit).
4. GitHub: Settings → mark repo as Template repository.
5. Create new repo `nucleus-realestate` via "Use this template".
6. In the new repo, immediately:
     git remote add upstream <template-repo-url>
     git fetch upstream
   so `git cherry-pick upstream/<sha>` becomes the path for boilerplate fixes.
7. Real Estate vertical follows docs/niche-extension.md verbatim:
     - Migrations 100+: re_properties, re_exclusive_contracts, re_viewings,
       re_offers, re_transactions, re_cma_reports
       (prefix `re_` per the playbook contract — keeps RLS helpers reusable)
     - Routes under app/dashboard/_niche/, app/portal/_niche/, app/[slug]/_niche/
     - Services under lib/services/realestate/<verb>.ts (per AGENTS.md)
     - Email templates in emails/realestate/
     - Flip FEATURE_GATING_ENABLED=true and define real plan tiers
       (commission-based or per-mandate counts — NOT the boilerplate
       "starter/growth/pro" placeholders).
```

### 4.3 Why template-and-fork beats the alternatives

| Option | Verdict |
|---|---|
| **Template repo + upstream-aware forks (recommended)** | Matches the existing `_niche/` design. Each vertical isolated; `git fetch upstream` + cherry-pick brings in boilerplate fixes. Low-friction. |
| Branch per vertical on one repo | Branches drift, merge conflicts get worse over time, CI/Vercel deploy gets messy. Avoid. |
| Monorepo with `apps/realestate` + `packages/core` | Best for true code-sharing, but requires extracting `core-pro` into a publishable package — significant refactor the codebase wasn't designed for. Re-evaluate at vertical #3, not now. |

### 4.4 Real-Estate-specific design notes (for the first niche planning session in the new repo)

The Real Estate vertical is unique in two ways the boilerplate doesn't yet cover, and the **exclusive-mandate angle sharpens both**:

1. **The contract is the central object, not the client.** A mandate has start/end dates, exclusivity scope (single property vs portfolio), commission terms, and a state machine: signed → marketing → under-offer → closed / expired / terminated. Build `re_exclusive_contracts` as a first-class entity with its own pipeline, not as a flag on `clients`.
2. **The viewer ≠ the client.** Per project memory, viewers/showings are already modeled on top of generic clients/appointments. For exclusive mandates, the *seller* is the paying client and viewers are leads attached to the *property*, not the seller. The schema supports this via `metadata jsonb` + `professional_clients`, but the first vertical migration should explicitly model `re_property_viewings (property_id, lead_id, ...)` rather than overload `appointments`.

### 4.5 Anti-patterns — do not

- Build vertical features inside `core-pro/` "just for now". Once niche code lands in the boilerplate, the `_niche/` contract is poisoned.
- Merge `next-fix` to main before clearing the 5 must-fix items — verticals forking an inconsistent base inherit the bugs N times.
- Flip `FEATURE_GATING_ENABLED` in the template repo. That belongs in each vertical with that vertical's real pricing.
- Skip the `git remote add upstream` step on the new vertical repo. Without it, boilerplate fixes are a manual diff each time.

---

## 5. Audit methodology (for reproducibility)

Four parallel `Explore` subagents, one per cluster:

- **Foundation & infra:** Sessions 1, 1.5, 2, 3, 4, 5, 23, 24
- **CRM core:** Sessions 6–11
- **Productivity:** Sessions 12–17
- **Cross-cutting:** Sessions 18–22, 25

Each agent was briefed with the relevant session deliverables from `nucleus-Implementation-Plan.md` and the intentional deviations to ignore (Sentry, Next 15.5, portal auth, feature gating). Each returned a DONE/PARTIAL/MISSING verdict per session plus a top-5 punch list. The cross-cutting agent specifically confirmed `docs/niche-extension.md` exists and is complete — the key prerequisite for the template-and-fork strategy.

---

*Document generated 2026-04-29. Re-run the audit after each batch of must-fix items lands, before tagging `v1.0.0-boilerplate`.*
