# Dashboard implementation status

A section-by-section audit of the left-hand dashboard menu, framed against
what `core-pro` ships **as the nucleus** (universal CRM machinery shared
by every fork) versus what each downstream **niche fork** is expected to
add. Companion to [`niche-extension.md`](./niche-extension.md), which
explains *how* a fork layers on top.

> Snapshot taken on 2026-04-18 against `main`. File paths cited below are
> stable anchors — if you're reading this six months from now, treat
> divergence as an audit gap, not an error in the doc.

## TL;DR

| Section | Status | Niche fork delta? |
| --- | --- | --- |
| `/dashboard` (Home) | ✅ Implemented | Add niche KPI tiles |
| Clients | ✅ Implemented | Niche-specific custom fields |
| Leads | ✅ Implemented | Niche scoring rules |
| Services | ✅ Implemented | Niche service variants (e.g. class packs) |
| Calendar | ✅ Implemented (no external sync) | Google/Outlook sync, niche resource booking |
| Messages | ✅ Implemented | Attachments, SMS bridge |
| Forms | ✅ Implemented | Branching logic, response analytics |
| Documents | ✅ Implemented | Inline preview, version history |
| Invoices | ✅ Implemented (no payment links) | Stripe Payment Links / dunning |
| Automations | ✅ Implemented (engine wired via Trigger.dev) | Niche trigger types + actions |
| Marketing | 🟡 Partial — send-now works, **scheduled send is data-only** | Campaign dispatcher job, social render-to-PNG, open/click analytics UI |
| Analytics | ✅ Implemented (DB aggregates, not mock) | Niche metrics tile |
| Site Builder | ✅ Implemented | Custom-domain DNS validation, theme library |
| **Niche** (sidebar group) | ⛔ Placeholder by design | The whole module |
| Settings → Profile | ✅ | — |
| Settings → Billing | ✅ (Stripe live) | — |
| Settings → Branding | ✅ | — |
| Settings → Calendar | ✅ | External provider sync |
| Settings → Integrations | 🟡 Config form only — **no live sync** | Each integration's worker |
| Settings → Notifications | ✅ | — |
| Settings → Team | ✅ (Clerk-backed) | — |
| Settings → GDPR | ✅ | — |
| Settings → Danger | ✅ | — |
| `/dashboard/notifications` (bell) | ✅ | — |

Legend: ✅ implemented end-to-end · 🟡 partial · ⛔ intentional placeholder.

---

## What "implemented" means here

A section is marked **implemented** only if all of the following hold:

1. **Schema**: a real Drizzle table in `lib/db/schema/` plus a Supabase
   migration in `supabase/migrations/` with row-level security.
2. **Server**: read queries in `lib/db/queries/` and write actions in
   `lib/actions/` (using `withRLS` and `authedAction` respectively).
3. **UI**: list / detail / create flows actually wired — not a static
   "coming soon" card.
4. **Side effects**: third-party calls (Stripe, Resend, Clerk, Supabase
   Realtime, Trigger.dev) are made for real, not mocked.
5. **i18n**: at least the nav label exists in `messages/en.json`.

Anything failing one of those is downgraded to **partial** or
**placeholder**, with the gap called out.

---

## Primary nav

### Home — `/dashboard`

Pulls live aggregates from `lib/analytics/queries.ts` (`getDashboardSummary`,
default range `month`) and renders four KPI tiles, today's agenda, an
unread-messages card, an activity feed, and a quick-actions row. The
KPIs are real DB counts, not placeholders.

- Server: `app/dashboard/page.tsx:30` calls `getDashboardSummary(resolveRange("month"))`.
- Niche delta: drop a niche KPI card row beneath the core grid by
  composing extra `<KpiCard>`s — no core change required.

### Clients — `/dashboard/clients`

Full CRUD: `clients` table, `professional_clients` junction (one
professional may share a client with another, e.g. transfer of care),
`tags` + `client_tags` for segmentation. List page filters by tag and
status; detail page is at `/dashboard/clients/[id]`. Invite flow uses
Clerk organisations and Resend.

- Schema: `lib/db/schema/clients.ts`.
- RLS recursion fix lives in `supabase/migrations/20260418120000_fix_clients_rls_recursion.sql`.
- Niche delta: add `{niche}_client_profile` sibling tables (per the
  playbook — never extend `clients` itself).

### Leads — `/dashboard/leads`

Kanban board with custom stages per professional. `lib/db/schema/leads.ts`
has `lead_stages`, `leads`, `lead_activities`. `ensureDefaultStages()`
seeds a "New → Won" pipeline on first visit. Drag-drop reordering and
per-card activity timelines are wired.

- Niche delta: scoring rule engine (today the score is a static int),
  source-specific intake forms, niche-specific stage templates.

### Services — `/dashboard/services`

A real catalog (not a placeholder): `services` table with name, price,
currency, duration, active flag. Public SELECT RLS so the micro-site can
list services without auth. Services feed the appointment scheduler and
the invoice line-item picker.

- Niche delta: niche-specific service variants — class packs (fit),
  package tiers (estate). Add `{niche}_service_variants` joined to
  `services.id`.

### Calendar — `/dashboard/calendar`

Month/week grid + agenda sidebar. Schema: `appointments`
(status: tentative · confirmed · completed · cancelled),
`availability_slots`, `calendar_buffer_minutes`. iCal feed served from
`/api/calendar/{id}/ical`. Realtime sync subscribes to `appointments`
changes. Trigger.dev job `trigger/jobs/appointments.ts` handles
reminder scheduling.

- **Gap (not niche)**: bidirectional Google Calendar / Outlook sync is
  *not* wired. Settings → Integrations has the config UI but no
  worker.
- Niche delta: room/resource booking, group classes, recurring
  appointment series with niche-specific cancellation rules.

### Messages — `/dashboard/messages`

Two-pane inbox. `conversations` (one per professional/client pair),
`messages` table. URL state holds the active conversation
(`?c=<id>`). Supabase Realtime drives the unread badge (now with
unique-channel-name fix per the memory entry).

- Gap: no attachments. No SMS/WhatsApp bridge.
- Niche delta: attach niche artifacts (e.g. workout PDFs, listing
  photos) to messages.

### Forms — `/dashboard/forms`

Schema-driven: `forms` (jsonb schema), `form_assignments` (with status
+ due date), `form_responses` (immutable). Builder + assign-to-client
flow + portal-side response capture. `evaluateTrigger("form_submitted",
…)` fires from `lib/actions/forms.ts:218`, so forms drive automations
already.

- Gap: response analytics (aggregations, filtering by field). No
  branching/conditional logic in the builder.
- Niche delta: niche templates (PAR-Q intake for fit, property
  preference for estate).

### Documents — `/dashboard/documents`

Metadata table (`documents`) over Supabase Storage files. Per-client
sharing, plan-based storage cap (read from `lib/stripe/plans.ts`),
upload via drag-drop.

- Gap: inline preview, version history, OCR/in-document search.
- Niche delta: niche document types (e.g. signed waivers for fit).

### Invoices — `/dashboard/invoices`

`invoices` (jsonb `line_items`, status workflow draft → sent → viewed →
paid → overdue), `invoice_settings`, `payment_reminders`. Stats strip
above the list shows outstanding / overdue / collected. PDF export
server-side. Trigger.dev job `trigger/jobs/invoices.ts` handles
reminder cadence.

- **Gap (not niche)**: invoices are *tracking-only* — no Stripe Payment
  Links / Paddle one-click checkout. The `paymentReminders` schema
  exists but the dunning sequence dispatcher only nudges via email; it
  doesn't generate a pay link.
- Niche delta: niche pricing models (subscription credits for fit,
  commission split for estate).

### Automations — `/dashboard/automations`

> The agent's first read of this section called it "stubbed". It isn't.
> The engine is fully wired through Trigger.dev.

`automations` (trigger_type + trigger_config + actions jsonb),
`automation_logs`. Engine in `lib/automations/engine.ts`:

- `evaluateTrigger(type, payload)` is called from real action sites:
  - `lib/actions/forms.ts:218` — form submission.
  - `lib/actions/appointments.ts:169` — appointment completion.
  - `trigger/jobs/inactive-client-checker.ts:78` — `client_inactive` (a
    scheduled Trigger.dev job).
- `processAutomationChain(automationId, targetId)` runs on the
  `automations.run-chain` Trigger.dev task (`trigger/jobs/automation-runner.ts`).
- Action runners cover: `send_email`, `send_notification`, `assign_form`,
  `add_tag`, `remove_tag`, `move_lead`, `create_task`, `wait`.

- Gap: trigger types are a fixed enum — no UI to register a custom
  trigger from a niche fork. A fork that wants
  `trigger_type = "fit.workout_completed"` has to extend the enum and
  add a hook site in its niche action.
- Niche delta: register additional trigger types and action runners per
  the niche fork; UI builder picks them up automatically once the
  enum is extended.

### Marketing — `/dashboard/marketing` 🟡

Three tabs: email campaigns, social templates, lead magnets. Schema in
`lib/db/schema/marketing.ts` is rich: `email_campaigns` +
`email_campaign_recipients` (with Resend message id and per-recipient
delivery state), `social_templates`, `lead_magnets` +
`lead_magnet_downloads`. Send-now via Resend works. Lead magnets land
in the `marketing/` Supabase Storage bucket.

**Concrete gaps in the nucleus** (not "niche delta" — these are
universal and should land here, not in a fork):

- **No scheduled-send dispatcher.** The schema has
  `email_campaigns.status = "draft"` and `scheduled_at` columns
  (`lib/db/schema/marketing.ts:44–45`) but **no Trigger.dev job** picks
  scheduled rows up. `trigger/jobs/` contains
  `appointments`, `automation-runner`, `inactive-client-checker`,
  `invoices` — and nothing for marketing.
- No webhook handler for Resend delivery / open / click events, so the
  per-recipient state in `email_campaign_recipients` never advances past
  "sent".
- Social templates render in-canvas client-side; no server export to
  PNG, no scheduled posting.

- Niche delta: niche-specific email templates and social layouts (one
  pre-baked layout per platform per niche).

### Analytics — `/dashboard/analytics`

Real DB aggregates from `lib/analytics/queries.ts`, not mock numbers.
Sections cover Clients, Leads, Revenue, Appointments, Messaging.
Charts (area, bar, funnel, pie) live in
`components/dashboard/analytics/chart-*`. PDF export wraps the same
data. Date range presets via `lib/analytics/range.ts`.

- Niche delta: a reserved niche-metrics tile slot — the fork plugs in
  its own `getDashboardSummary` extension and renders alongside the
  core sections.

### Site Builder — `/dashboard/site-builder`

WYSIWYG-ish editor with live preview. `micro_sites` table per
professional (slug, theme, sections jsonb, SEO metadata, social links,
publish status). Public RLS for published sites. Default theme + a
fixed set of section types: hero, services, testimonials, CTA, contact
form, FAQ.

- Gap: custom-domain DNS validation, additional themes.
- Niche delta: niche section types (e.g. class schedule, listing grid).
  Per the playbook this is wired through `app/[slug]/_niche/` and a
  section-type extension in `components/micro-site/theme.ts`.

---

## Niche group (sidebar section)

Single greyed-out entry, by design. `app/dashboard/_niche/` contains
only `README.md`. The fork:

1. Replaces `NICHE_NAV` in `components/dashboard/nav-items.ts` with its
   own routes (the current array is a one-line placeholder so the
   "Niche" header still shows).
2. Drops route files into `app/dashboard/_niche/<feature>/`.
3. Adds prefixed tables (`fit_*`, `estate_*`, …) per the niche
   extension playbook.

The core never imports from `_niche/` — that's the contract. See
[`niche-extension.md`](./niche-extension.md) §"Conventions" for the
full ruleset.

---

## Settings (pinned bottom of sidebar)

Every sub-page has a real `page.tsx` + `form.tsx` pair, no scaffolds.

| Sub-route | What it actually does |
| --- | --- |
| `profile` | Edit professional record (name, bio, avatar, locale, currency, certifications) via `updateProfessionalAction`. |
| `billing` | Live Stripe integration — checkout, billing portal, plan limits via `lib/stripe/`. Usage meters read real client/storage counts. |
| `branding` | Edit branding jsonb on `professionals.branding` (colors, logo, font); consumed by micro-site + email templates. |
| `calendar` | Business hours, break times, buffer minutes — same data the booking flow reads. |
| `integrations` 🟡 | **Config form only.** Stores API keys / OAuth metadata in jsonb. No live worker for Google Calendar / Zapier / webhooks — entries are decorative until each integration's job exists. |
| `notifications` | Email/push toggles, backed by `notification_settings` and `lib/actions/notifications.ts`. |
| `team` | Clerk organisation members — invite, role/permission edits via Clerk Org API. No custom team tables. |
| `gdpr` | Bulk client-data deletion (cascades to messages/appointments/documents/forms). Data export form is wired to action; execution path is queued, not synchronous. |
| `danger` | Account soft-delete and workspace reset (wipes domain tables for the current professional). |

---

## `/dashboard/notifications` (bell icon, not a sidebar item)

Full notification history page backed by the `notifications` table and
`useNotifications` hook (Realtime-subscribed). Domain events from
across the app (form submitted, lead converted, invoice paid, etc.)
write rows here — same source of truth as the bell badge.

---

## What lands in the nucleus next vs. in a fork

The remaining gaps split cleanly into two buckets.

**Stays in the nucleus** — universal CRM machinery, every fork wants it:

- Marketing campaign dispatcher (Trigger.dev job for scheduled sends).
- Resend webhook handler for open/click/bounce → recipient state.
- Stripe Payment Links on invoices + dunning sequence dispatcher.
- Google Calendar / Outlook two-way sync worker.
- Resend / external integrations workers for the rows the
  Settings → Integrations form already collects.
- Documents inline preview + version history.
- Form builder branching logic, response aggregation UI.
- Message attachments.
- Custom domain DNS validation for micro-sites.

**Belongs in a niche fork** — vertical-specific by definition:

- The whole **Niche** sidebar section: tables prefixed with the niche
  short name, routes under `app/dashboard/_niche/`,
  `app/portal/_niche/`, `app/[slug]/_niche/`.
- Niche KPI tiles on Home + Analytics.
- Niche service variants (class packs vs. property packages, etc.).
- Niche scoring rules for leads.
- Niche trigger types + action runners for Automations.
- Niche email templates and social layouts.
- Niche micro-site section types.
- Per-niche client profile sibling tables (never extend `clients`).

When in doubt, the rule from the playbook applies: *is this universal?*
Yes → nucleus. No → `_niche/`.
