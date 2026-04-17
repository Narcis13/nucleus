# EstateCore Pro — Real Estate Delta Implementation Plan

**Version**: 1.0
**Date**: 2026-04-17
**Author**: Narcis (with architectural assist)
**Status**: Ready for sequential Claude Code execution
**Prerequisite**: Nucleus boilerplate at Session 25 (see `nucleus-Implementation-Plan.md`, `SESSION-25-READINESS.md`)
**Target**: Fully functional CRM for Romanian real estate agents specialized in exclusive representation contracts, as specified in `EstateCorePro-PRD-v1.0.md`
**Baseline code**: `/Users/narcisbrindusescu/newme/nucleus/core-pro/`

---

## 0. Purpose, Scope, and How To Use This Document

### 0.1 What this document is

This document specifies the **real-estate-specific delta** to be added on top of the generic "nucleus" (CorePro) boilerplate in order to produce EstateCore Pro. It is organized as **twenty sequential sessions (S26 through S45)**, each sized to be completed by Claude Code in a single focused working session (~2–4 hours of real execution time).

Every session is:

1. **Dependency-ordered** — each session builds on previous sessions only. No forward references.
2. **Self-describing** — it tells Claude Code exactly which files to read before starting, what patterns to follow, what to create, and how to verify success.
3. **Atomically deliverable** — each session ends in a commit-ready, demonstrable state.

Together the 20 sessions turn the generic nucleus into a fully functional exclusive-representation-focused real-estate CRM.

### 0.2 What this document is **not**

- **It is not a rewrite of the EstateCorePro PRD.** It assumes the PRD at `docs/EstateCorePro-PRD-v1.0.md` is authoritative for *what* the product must do. This document specifies *how* and *in what order* to implement it.
- **It does not re-specify anything the nucleus already provides.** Auth (Clerk v7 + Supabase Third-Party Auth), multi-tenant RLS, Stripe billing with plan gating, real-time messaging, calendar/appointments/iCal, drag-and-drop forms builder, document storage (Supabase Storage), invoice tracking with React-PDF, automation engine with Trigger.dev v4, email campaigns + social templates + lead magnets (Marketing Kit), generic micro-site with themes and contact forms, client portal shell, notifications (in-app + email + web push), analytics with Recharts, i18n with `next-intl`, PWA, Sentry + PostHog + Upstash rate limiting, GDPR endpoints — **all of this is already done**. Sessions below assume it and extend it; they do not rebuild it.
- **It is not a separate codebase.** All work lands in `/core-pro/` alongside the nucleus. The `_niche` placeholders (`lib/db/schema/_niche.ts`, `app/dashboard/_niche/`, `app/portal/_niche/`, `app/[slug]/_niche/`) are the documented extension seams — every session below drops code into them.
- **It is not optional.** Every session is required to deliver the PRD. Skipping one leaves a hole that a later session assumes closed.

### 0.3 How Claude Code should use this document

For every session, the executor (Claude Code) must:

1. **Load the "Context to Load" list** in that session before writing a single line of code. Every listed file must be read. This is non-negotiable — the nucleus has strict conventions (RLS helpers, `withRLS`, `authedAction`, `pgPolicy` factories, `currentProfessionalIdSql`) that are easy to violate if the patterns aren't freshly in context.
2. **Verify preconditions** via the "Dependencies" checklist — confirm prior-session migrations ran, prior-session tables exist, prior-session files are on disk.
3. **Implement tasks in listed order.** Task order within a session is also dependency-ordered.
4. **Answer the "Self-check questions" out loud before submitting.** These flag the three or four things the session is most likely to get wrong.
5. **Run the "Verification" steps** before marking the session complete.
6. **Commit with the convention `session{N}: <summary>`** to match the existing git log style (`session15: invoices`, `session17: marketing`, etc.). Migration files follow `YYYYMMDDHHMMSS_session{N}_<topic>.sql`.

### 0.4 Session map at a glance

| # | Session | Theme | Core deliverable |
|---|---|---|---|
| S26 | Geospatial foundation | Infrastructure | PostGIS + Mapbox + `neighborhoods` table |
| S27 | Properties schema | Data model | `properties` + `property_photos/rooms/features/documents/tags` + storage bucket |
| S28 | Properties dashboard | Agent UI | Listings list, wizard create, detail/edit, plan limits |
| S29 | Property public pages | Micro-site | `app/[slug]/_niche/property/[id]` + contact/viewing CTA |
| S30 | Buyer search profiles | Matching | `buyer_search_profiles` + `property_matches` + matching job |
| S31 | Exclusive contract generator | Core differentiator | `exclusive_contracts` + template system + PDF |
| S32 | Contract activity log | Transparency | `contract_activities` + auto-log hooks + manual entries |
| S33 | Digital signature | Contract execution | Provider abstraction + signing flow + status tracking |
| S34 | Viewings management | Operations | `viewings` + `viewing_feedback` + booking flow + reminders |
| S35 | Open houses | Events | `open_houses` + public RSVP + check-in + lead creation |
| S36 | Offers management | Negotiation | `offers` + submit/negotiate/accept UI |
| S37 | Transaction pipeline | RE deal flow | `transactions` + `transaction_stages` + `transaction_documents` + Kanban |
| S38 | CMA tool | Evaluation | `cma_reports` + `cma_comparables` + picker + PDF + portal view |
| S39 | Real-estate marketing kit | Content | Property brochures, RE email/social templates, matching emails |
| S40 | Portal syndications | Distribution | XML feeds for Imobiliare.ro / Storia / OLX + attribution |
| S41 | Seller portal | Client transparency | Activity reports, viewings feed, offers, documents |
| S42 | Buyer portal | Client shopping | Shortlist, comparator, alerts, mortgage calculator |
| S43 | RE automations & analytics | Insights | RE triggers, weekly report automation, RE KPIs, commission records |
| S44 | End-to-end testing | Quality | Full Playwright suite covering golden paths + edges |
| S45 | Credentials & go-live | Production | All API keys, Stripe products, deployment, monitoring |

### 0.5 Golden thread

The exclusive-representation contract (S31–S33) is the product's soul. Everything upstream of it (properties, buyers, CMA) exists to *justify signing it*. Everything downstream (viewings, offers, activity log, seller portal) exists to *prove the exclusivity was worth it*. When in doubt about a design decision, ask: does this help the agent sign an exclusive, or prove the exclusive was earned? That is the hierarchy.

---

## 1. Prerequisites — State of the Nucleus

Do not start S26 until the following are verified true:

### 1.1 Code state

- `core-pro/` builds (`npm run build`) without TypeScript errors.
- `npm run db:push` (or `npx drizzle-kit push` / `supabase db push`) reports no pending migrations; latest applied migration is `20260417100000_session25_rls_fixes.sql` or later.
- `npm run dev` starts successfully at `http://localhost:3000`.
- Dashboard at `/dashboard` is reachable by a signed-in professional; portal at `/portal` is reachable by an invited client.
- Stripe webhooks verify locally (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`).
- Clerk webhooks verify (Svix dashboard or `ngrok`).
- Playwright smoke test `tests/e2e/smoke.spec.ts` passes.

### 1.2 Known S25-era gaps to address opportunistically (not blocking)

These are flagged in `SESSION-25-READINESS.md`. They should be fixed as part of S26–S28 where relevant:

- `types/database.ts` is still a stub — regenerate with `npx supabase gen types typescript --local > types/database.ts` after each new migration in this plan.
- `next.config.ts` `images.remotePatterns` — add `*.supabase.co`, `mapbox-hosted`, and any photo-CDN domains used by portal syndication feeds in S40.
- The `updated_at` trigger must be attached **in each new migration** that adds a table with an `updated_at` column (see S27 template). `9903_triggers.sql` does NOT re-run on incremental pushes.
- i18n: every new UI string in sessions below must be added to `messages/ro.json` (primary) and `messages/en.json` (secondary). No hardcoded Romanian or English strings.

### 1.3 Branching & commits

- Work on `main` as per git log style. One commit per session minimum; squash WIP commits before session close.
- Migration files MUST be part of the same commit as the code that depends on them — never commit the migration in isolation.

---

## 2. Architecture Strategy — How Real Estate Layers on the Nucleus

### 2.1 The one-sentence architecture

Real estate is the nucleus **plus** a `properties` entity with photos/rooms/features, **plus** five relationship tables hanging off it (`exclusive_contracts`, `viewings`, `offers`, `transactions`, `cma_reports`), **plus** buyer-side search/matching, **plus** RE-specific UIs under `_niche/`.

### 2.2 Where everything lives

```
core-pro/
├── lib/db/schema/
│   ├── _niche.ts                    # (existing placeholder — keep for FitCore etc.)
│   ├── properties.ts                # S27
│   ├── exclusive_contracts.ts       # S31
│   ├── contract_activities.ts       # S32
│   ├── viewings.ts                  # S34
│   ├── open_houses.ts               # S35
│   ├── offers.ts                    # S36
│   ├── transactions.ts              # S37
│   ├── cma.ts                       # S38
│   ├── buyer_search_profiles.ts     # S30
│   ├── property_matches.ts          # S30
│   ├── neighborhoods.ts             # S26
│   ├── portal_feeds.ts              # S40
│   ├── portal_reports.ts            # S41
│   └── commission_records.ts        # S43
│
├── lib/actions/re/                  # New subfolder — all RE actions
│   ├── properties.ts | contracts.ts | viewings.ts | offers.ts | transactions.ts | cma.ts | matches.ts
│
├── lib/db/queries/re/               # New subfolder — all RE queries
│   └── <same list>
│
├── lib/re/                          # Real-estate subsystems
│   ├── geo.ts                       # PostGIS helpers (S26)
│   ├── map.ts                       # Mapbox client (S26)
│   ├── contract-template.ts         # Template engine (S31)
│   ├── contract-pdf.tsx             # React PDF contract doc (S31)
│   ├── signature/
│   │   ├── provider.ts              # Abstraction (S33)
│   │   ├── docusign.ts              # (S33)
│   │   └── upload-fallback.ts       # (S33)
│   ├── cma/
│   │   ├── comparables.ts           # (S38)
│   │   ├── adjustments.ts           # (S38)
│   │   └── pdf.tsx                  # (S38)
│   ├── matching.ts                  # Buyer ↔ property matching (S30)
│   ├── brochure-pdf.tsx             # Property brochure (S39)
│   ├── feeds/
│   │   ├── imobiliare.ts | storia.ts | olx.ts   # (S40)
│   │   └── xml.ts
│   └── reports/
│       └── weekly-activity.tsx      # Seller activity report PDF (S41)
│
├── app/dashboard/_niche/
│   ├── properties/                  # S28
│   ├── contracts/                   # S31
│   ├── viewings/                    # S34
│   ├── open-houses/                 # S35
│   ├── offers/                      # S36
│   ├── transactions/                # S37
│   ├── cma/                         # S38
│   └── commissions/                 # S43
│
├── app/portal/_niche/
│   ├── seller/                      # S41
│   └── buyer/                       # S42
│
├── app/[slug]/_niche/
│   ├── property/[id]/               # S29
│   └── open-house/[id]/             # S35 (public RSVP page)
│
├── components/dashboard/re/         # RE dashboard components
├── components/portal/re/            # RE portal components
├── components/micro-site/re/        # RE micro-site components
│
├── trigger/jobs/re/                 # RE background jobs
│   ├── weekly-seller-report.ts      # S43
│   ├── feed-publisher.ts            # S40
│   ├── matching-runner.ts           # S30
│   ├── contract-expiry-alert.ts     # S31
│   └── viewing-feedback-request.ts  # S34
│
└── supabase/migrations/
    └── 20260418*_session26_postgis.sql  # ...onwards
```

### 2.3 Naming convention for the delta

- **Tables**: No prefix. `properties`, `viewings`, `offers` — not `re_properties`. This matches the nucleus (no `core_` prefix on anything). The `metadata jsonb` discriminator is the extension pattern; adding a `vertical` column or prefixes would contradict the boilerplate's design.
- **Schema files**: one file per domain table or tight cluster. `properties.ts` holds `properties` + `property_photos` + `property_features` + `property_rooms` + `property_documents` (tight cluster).
- **RLS policy names**: `<table>_professional_all` for owner access, `<table>_client_select` for portal read access, `<table>_public_select` for anonymous read access (only where intentional — e.g., active `properties` for the micro-site).
- **Migration files**: `YYYYMMDDHHMMSS_session{NN}_<topic>.sql` — e.g., `20260418103000_session27_properties.sql`. Drizzle generates the timestamp; rename the file to add the session suffix for greppability.
- **Plan limit keys**: `max_listings` (not `max_properties` — matches the PRD text "listinguri active"). Add as a new key alongside `max_clients` in S28; both apply.

### 2.4 RLS pattern (must be followed on every new table)

Every tenant-scoped table added in S26–S43 MUST have:

```ts
import { pgTable, uuid, text, timestamp, pgPolicy, index } from "drizzle-orm/pg-core";
import { authenticatedRole, anonRole } from "drizzle-orm/supabase";
import { sql } from "drizzle-orm";
import { professionals } from "./professionals";
import { createdAt, updatedAt, currentProfessionalIdSql } from "./_helpers";

export const properties = pgTable(
  "properties",
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
    professionalIdIdx: index("idx_properties_professional_id").on(t.professionalId),
    professionalAll: pgPolicy("properties_professional_all", {
      as: "permissive",
      for: "all",
      to: authenticatedRole,
      using: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
      withCheck: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
    }),
    // Anon/client policies added per-table as needed
  })
);
```

And in the generated migration, add the `updated_at` trigger:

```sql
CREATE TRIGGER set_updated_at_properties
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
```

### 2.5 What the nucleus provides to the delta (do not rebuild)

| Need | Use |
|---|---|
| Tenant isolation | `withRLS()` in `lib/db/rls.ts`; `authedAction` factory in `lib/actions/safe-action.ts` |
| Auth | Clerk v7 + `currentProfessionalIdSql`, `currentClientIdSql` helpers |
| Professional identity | `professionals` table; RE re-uses this as "agent" |
| Client identity | `clients` + `professional_clients` junction; RE adds `buyer_search_profiles` and roles |
| Scheduling primitives | `appointments` + `availability_slots` — viewings extend `appointments` with a polymorphic reference |
| Calendar & iCal | `.ics` attachments, iCal feed, 24h/1h reminders via Trigger.dev — reused for viewings |
| Forms | Pre-built templates for intake, feedback — RE adds viewing-feedback and seller-intake templates |
| Documents | Supabase Storage buckets + `documents` table — RE re-uses for contract PDFs, CF, certificat energetic |
| Messaging | `conversations` + `messages` — one thread per agent-client pair, reused unchanged |
| Notifications | `sendNotification()` multi-channel — RE adds new `type` values |
| Automations | Generic trigger/action engine — RE registers new triggers (`viewing_completed`, `offer_received`, `contract_expiring`) and new action types (`generate_activity_report`, `publish_to_portal`) |
| Marketing kit | Email campaigns, social templates, lead magnets — RE adds new template categories and property-scoped campaigns |
| Micro-site | `app/[slug]/` already renders; RE injects a new section type (`property_portfolio`) and adds `app/[slug]/_niche/property/[id]` route |
| Portal shell | `app/portal/` already branded; RE adds `_niche/seller` and `_niche/buyer` page trees |
| Invoices | Generic invoice CRUD + PDF — re-used for commission billing |
| Stripe billing | Plan gating — RE adds `max_listings` limit and RE-specific feature flags |
| i18n | `messages/ro.json` + `messages/en.json` — RE adds new keys under `re.*` namespace |
| Analytics | Recharts framework — RE adds new KPI queries |
| PWA | All already configured — RE benefits automatically |

### 2.6 What is not in the nucleus and must be added by the delta

- PostGIS extension and any geometry/geography column handling (S26).
- Mapbox or Google Maps for rendering (S26).
- Digital signature provider (DocuSign API or Autogram.sk) (S33).
- Real-estate portal feed generators (XML/API for Imobiliare.ro, Storia, OLX) (S40).
- Property photo optimization pipeline (watermark, resize, cover selection) — uses Supabase image transformations but adds domain-specific logic (S27).
- Contract template rendering engine (Markdown + Mustache-style merge tags → PDF) (S31).
- CMA comparables selection + adjustments math (S38).

---

## 3. External Services & Credentials Matrix

This is the full list of external services used once S26–S45 are complete. Rows flagged "new vs nucleus" did not exist before this plan. S45 is the dedicated session for finalizing all credentials; this table is a pointer.

| Service | Role | New? | Account needed | Env vars added in |
|---|---|---|---|---|
| Clerk | Auth + Organizations | no | existing | — |
| Supabase | DB + Storage + Realtime | no | existing | — |
| Supabase (PostGIS) | Geo queries | **yes** | same project, enable extension | S26 |
| Stripe | Subscriptions | no | existing | — (S28 adds `STRIPE_GROWTH_RE_PRICE_ID` if pricing diverges) |
| Resend | Email | no | existing | — |
| Upstash Redis | Rate limiting | no | existing | — |
| Trigger.dev v4 | Jobs | no | existing | — |
| Sentry | Errors | no | existing | — |
| PostHog | Analytics + flags | no | existing | — |
| Mapbox | Map rendering + geocoding + isochrone | **yes** | new account, Free tier is enough for dev | S26 |
| DocuSign (or Autogram) | Digital signature | **yes** | DocuSign developer sandbox or Autogram Slovak public endpoint | S33 |
| Imobiliare.ro | Portal syndication | **yes** | partner/feed account via `office@imobiliare.ro` | S40 |
| Storia.ro | Portal syndication | **yes** | partner account | S40 |
| OLX.ro (Imobiliare) | Portal syndication | **yes** | partner account / XML feed | S40 |
| Google Maps JS (optional fallback) | Maps | no (optional) | — | S26 (stretch) |
| ANCPI / e-Terra (future) | Cadastre lookup | — | — | out of scope |

Consolidated `.env` additions over the delta:

```bash
# S26 — Geo
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx
MAPBOX_SECRET_TOKEN=sk.xxx        # for server-side geocoding

# S33 — Signature
SIGNATURE_PROVIDER=docusign        # 'docusign' | 'autogram' | 'upload'
DOCUSIGN_INTEGRATION_KEY=...
DOCUSIGN_USER_ID=...
DOCUSIGN_ACCOUNT_ID=...
DOCUSIGN_BASE_URL=https://demo.docusign.net/restapi
DOCUSIGN_PRIVATE_KEY_PATH=/app/secrets/docusign-rsa.key

# S40 — Portal syndications
IMOBILIARE_FEED_TOKEN=...
IMOBILIARE_AGENT_ID=...
STORIA_API_KEY=...
STORIA_OFFICE_ID=...
OLX_PARTNER_KEY=...

# S43 — Cron for seller reports
CRON_SECRET_RE=...                 # rotate separate from main CRON_SECRET
```

Update `lib/env.ts` each session to validate the new keys.

---

## 4. Naming & Convention Recap (for Claude Code's quick reference)

Before any session, Claude Code should be able to recite these from memory:

1. **Every new table**: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE`, `created_at` + `updated_at` (via `createdAt()` / `updatedAt()` factories), RLS enabled, `<table>_professional_all` policy, `updated_at` trigger in the migration, index on `professional_id`.
2. **Client-visible rows** (e.g., viewings for seller's property): add a `<table>_client_select` policy scoped via a subquery joining `professional_clients` or a property-ownership check.
3. **Server actions**: use `authedAction` for everything. Never call Drizzle directly outside `withRLS` except in Trigger.dev jobs (which use `dbAdmin`).
4. **Queries**: `lib/db/queries/re/<domain>.ts`, one function per logical read. Always accept a `Tx` parameter so it composes with `withRLS`.
5. **Types**: add to `types/domain.ts` using `InferSelectModel<typeof table>`.
6. **i18n**: all UI strings go through `useTranslations('re.<namespace>')`. Add keys to both `ro.json` and `en.json`.
7. **Feature flag before plan gate**: new UI modules wrap in `<FeatureFlag flag="re_contracts">{children}</FeatureFlag>` (PostHog) AND in `<PlanGate feature="re_contracts">`. Add the flag to `lib/posthog/flags.ts` and the feature to `lib/stripe/plans.ts`.
8. **Sentry tag**: all new server actions declare an `actionName` prefix `re.<module>.<verb>` (e.g., `re.properties.create`).
9. **PostHog event**: client-side every meaningful RE action emits `re.<object>.<verb>` (e.g., `re.property.published`, `re.viewing.scheduled`, `re.contract.signed`).
10. **Migration test**: after adding any RLS policy, write a smoke test that (a) the professional can do the action, (b) another professional cannot, (c) an anon user cannot (or can, if policy intends it).

---

# Sessions

---

## Session 26 — Geospatial Foundation

### Goal
Enable geographic features that every subsequent session depends on: PostGIS extension, `neighborhoods` table with polygon geometries, `geom` columns on properties-to-come (defined here in abstract, used in S27), server-side geocoding via Mapbox, a reusable `<PropertyMap />` React component, and an isochrone (travel-time) helper.

### Why this order
Properties (S27) need a `geom` column and address → lat/lng geocoding from the moment of creation. Neighborhoods (zones/cartiere) are referenced by properties and by buyer search profiles (S30). Doing geo now means S27 onward can use PostGIS operators without retrofits.

### Context to Load
Before starting, Claude Code must read:

- `lib/db/schema.ts` (how schemas are aggregated)
- `lib/db/schema/_helpers.ts` (`createdAt`, `updatedAt`, `currentProfessionalIdSql`, `anonRole`, `authenticatedRole`)
- `lib/db/rls.ts` (`withRLS` pattern)
- `supabase/migrations/0000_extensions.sql` (how to add extensions)
- `supabase/migrations/0001_functions.sql` (how to add shared SQL functions)
- `lib/env.ts` (how env vars are validated)
- `next.config.ts` (Turbopack config, image patterns, Sentry wrapper)
- The PRD sections 2.3, 4.3 (tabel `neighborhoods`), and 5.3.1 (geocodare automată)

### Dependencies
- Nucleus at S25. Supabase project has PostGIS available (`CREATE EXTENSION postgis` succeeds — verify in Supabase dashboard → Database → Extensions; if it's not toggle-able, enable in project settings).
- A Mapbox account with a public token (`pk.*`) and a secret token (`sk.*`, server-side only).

### External Services
- **Mapbox**: create account, new token with scopes `styles:read`, `fonts:read`, `datasets:read`, `geocoding`, and for the secret token add `uploads:write` only if needed (not for MVP).

### Data Model

**`neighborhoods`** — shared data about zones/cartiere (national coverage seeded per city).
- `id uuid` PK
- `name text NOT NULL` (e.g., "Pipera")
- `city text NOT NULL` (e.g., "București")
- `county text NOT NULL` (e.g., "Ilfov")
- `country text NOT NULL DEFAULT 'RO'`
- `slug text` UNIQUE nullable (for SEO URLs later)
- `geom geometry(MultiPolygon, 4326)` — boundary polygon
- `centroid geometry(Point, 4326)` — computed or manual
- `stats jsonb` — `{ median_price_sqm, avg_dom, listings_count, last_updated }`
- `description text` — optional editorial blurb
- `created_at, updated_at`

Seed data: 30–50 Bucharest sectors + cartiere + top 10 for Cluj, Timișoara, Iași, Brașov, Constanța. Initial seed is a coarse `MultiPolygon` — refinement can come later; the point of seeding is so S27 properties can `ST_Contains` to determine which neighborhood a property sits in.

**`neighborhoods`** is not tenant-scoped — it is platform data. RLS: everyone (anon + authenticated) can SELECT; only service role can INSERT/UPDATE/DELETE (admin job for seed & future CMS).

### Tasks (in order)

1. **Enable PostGIS extension** — hand-written migration `supabase/migrations/YYYYMMDDHHMMSS_session26_postgis.sql`:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   CREATE EXTENSION IF NOT EXISTS postgis_topology;  -- if needed for isochrone later
   ```
   Add this BEFORE the Drizzle-generated migration by using a low-numbered timestamp prefix or by using `supabase migration new`.

2. **Add `lib/db/schema/neighborhoods.ts`** with the table above. Use `customType` for `geometry` (Drizzle doesn't have native PostGIS types). Pattern:
   ```ts
   import { customType } from "drizzle-orm/pg-core";
   export const geometry = customType<{ data: string; driverData: string }>({
     dataType() { return "geometry(Geometry, 4326)"; },
   });
   ```
   Export from `lib/db/schema.ts`.

3. **Generate Drizzle migration** with `npm run db:generate`. Rename to `..._session26_neighborhoods.sql`. Add `updated_at` trigger at the bottom.

4. **Create `lib/re/geo.ts`** with:
   - `geocodeAddress(address: string, options?): Promise<GeoResult>` using Mapbox Geocoding API with RO country bias.
   - `reverseGeocode(lat: number, lng: number): Promise<GeoResult>` (needed by S27 when agent drops a pin).
   - `findNeighborhood(lat: number, lng: number, tx: Tx): Promise<Neighborhood | null>` using `ST_Contains` on `neighborhoods.geom`.
   - `distanceMeters(a: Point, b: Point): number` helper using `ST_Distance`.
   - `isochroneMinutes(origin: Point, minutes: number): Promise<GeoJSON>` via Mapbox Isochrone API.

5. **Create `lib/re/map.ts`** for client-side map config (token, default style, default center=București).

6. **Create `components/shared/re/PropertyMap.tsx`** (client component) — `mapbox-gl`-backed map with:
   - Marker rendering for a single property (`<PropertyMap property={p} />`)
   - Multi-marker rendering (`<PropertyMap properties={list} fitBounds />`)
   - POI overlay (schools, transit — fetched from Mapbox Tilequery) — lazy on toggle
   - Neighborhood boundary overlay (toggle)

7. **Add env vars** to `lib/env.ts`:
   ```ts
   server: {
     MAPBOX_SECRET_TOKEN: z.string().startsWith("sk."),
   },
   client: {
     NEXT_PUBLIC_MAPBOX_TOKEN: z.string().startsWith("pk."),
   }
   ```

8. **Seed neighborhoods** — SQL seed in `supabase/seed.sql` or a one-off TS script `scripts/seed-neighborhoods.ts` that fetches Bucharest sector polygons from OpenStreetMap (Overpass API) and inserts them. If time is short, seed the 6 Bucharest sectors as rectangles — the refinement of polygons is not blocking.

9. **Add the `next.config.ts` image pattern** for Mapbox: `{ protocol: "https", hostname: "*.mapbox.com" }`.

10. **Update `types/database.ts`** via `npx supabase gen types typescript --local > types/database.ts`. Commit the regenerated file.

11. **Smoke test** — in `tests/e2e/re-geo.spec.ts`, a basic test that visits `/dashboard` with a mock property and verifies `<PropertyMap>` renders (use a mock token in CI).

### RLS Policies

```ts
// neighborhoods — platform data
pgPolicy("neighborhoods_public_select", {
  as: "permissive", for: "select",
  to: [anonRole, authenticatedRole],
  using: sql`true`,
});
pgPolicy("neighborhoods_admin_all", {
  as: "permissive", for: "all",
  to: sql`service_role`,
  using: sql`true`,
});
```

### Verification

- `SELECT postgis_version();` returns a version string.
- `SELECT count(*) FROM neighborhoods;` > 0.
- `geocodeAddress("Calea Victoriei 100, București")` returns `{ lat, lng, neighborhoodId, ... }`.
- A React page rendering `<PropertyMap property={{ lat: 44.4268, lng: 26.1025 }} />` shows a map centered on Bucharest with a marker.
- Build passes; typegen passes.

### Self-check questions for Claude Code

1. Did I add the PostGIS extension in a migration that runs BEFORE any migration referencing `geometry`? (Alphabetical order of filenames determines order in Supabase.)
2. Did I add the `updated_at` trigger to the `neighborhoods` migration? (The consolidated `9903_triggers.sql` does not re-run incrementally.)
3. Is the Mapbox secret token only used in server code and never imported into a client component?
4. Did I handle the case where `geocodeAddress` returns no result? (Silent fallback to `lat=null, lng=null` is acceptable; S27 will allow manual pin-drop.)
5. Does `findNeighborhood` return `null` when a point lies outside any seeded polygon? (It should — properties outside known zones are valid.)

---

## Session 27 — Properties Schema Foundation

### Goal
Define the core `properties` entity and its satellite tables (`property_photos`, `property_features`, `property_rooms`, `property_documents`, `property_tags`), the Supabase Storage bucket for property media, RLS policies including public read for active listings, and generated TypeScript types. No UI in this session — strictly schema + storage + types.

### Why this order
Every subsequent session touches `properties`. Landing it clean — with all satellite tables and their RLS in place — avoids migration churn later. By separating schema (S27) from UI (S28), the UI session can focus purely on UX without chasing type errors.

### Context to Load

- Session 26 outputs (`geometry` customType, `neighborhoods` table, `findNeighborhood`).
- `lib/db/schema/services.ts` — the closest existing analogue (tenant-scoped, has a `_public_select` policy, has `metadata jsonb`); use as template.
- `lib/db/schema/documents.ts` — for `property_documents` pattern.
- `supabase/migrations/9900_storage_buckets.sql` + `9901_storage_policies.sql` — how storage buckets are declared.
- `lib/stripe/plans.ts` — where `max_listings` will plug in (defined in S28, but the schema must not block it).
- PRD sections 4.3 (all `property_*` tables), 5.3.1–5.3.3 (listing structure, status, visibility).

### Dependencies
- S26 complete. PostGIS live. `neighborhoods` exists.

### External Services
None new.

### Data Model

**`properties`** (the hub):

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `professional_id` | uuid FK → professionals | cascade delete |
| `title` | text NOT NULL | editable, auto-suggested from type + rooms + zone |
| `slug` | text UNIQUE per professional | used in public URL `/[agent-slug]/property/[slug]`; generated |
| `property_type` | enum | `apartment | house | land | commercial | garsoniera | penthouse | duplex` |
| `transaction_type` | enum | `sale | rent | both` |
| `status` | enum | `draft | active | reserved | sold | rented | withdrawn | expired` (PRD 5.3.3) |
| `listed_at` | timestamptz | set on first transition to `active` |
| `sold_at` | timestamptz nullable | |
| `address_line` | text | human-readable |
| `city` | text | denormalized from neighborhood for speed |
| `county` | text | |
| `country` | text default 'RO' | |
| `postal_code` | text nullable | |
| `neighborhood_id` | uuid FK → neighborhoods nullable | |
| `lat` | numeric(10,7) nullable | redundant with geom but easier to read |
| `lng` | numeric(10,7) nullable | |
| `geom` | `geometry(Point, 4326)` | indexed via GIST |
| `asking_price` | numeric(14,2) | |
| `floor_price` | numeric(14,2) nullable | agent-only minimum, hidden from client & public |
| `currency` | text default 'EUR' | `EUR | RON | USD` |
| `price_per_sqm` | numeric(10,2) GENERATED ALWAYS AS (asking_price / NULLIF(useful_sqm, 0)) STORED | computed for search |
| `useful_sqm` | numeric(8,2) nullable | |
| `built_sqm` | numeric(8,2) nullable | |
| `land_sqm` | numeric(10,2) nullable | |
| `rooms` | smallint nullable | |
| `bathrooms` | smallint nullable | |
| `balconies` | smallint nullable | |
| `terraces` | smallint nullable | |
| `parking_spots` | smallint nullable | |
| `floor` | smallint nullable | |
| `total_floors` | smallint nullable | |
| `year_built` | smallint nullable | |
| `compartmentation` | text nullable | `decomandat | semidecomandat | circular | open_space` |
| `energy_class` | text nullable | `A | B | C | D | E | F | G` |
| `heating_type` | text nullable | |
| `monthly_costs_estimate` | numeric(8,2) nullable | |
| `monthly_rent_amount` | numeric(10,2) nullable | only for transaction_type = rent/both |
| `rent_period` | text nullable | `month | year` |
| `cover_photo_id` | uuid FK → property_photos nullable | |
| `description` | text nullable | long description |
| `description_short` | text nullable | social preview |
| `is_featured` | boolean default false | homepage promotion |
| `virtual_tour_url` | text nullable | Matterport/YouTube |
| `floor_plan_url` | text nullable | |
| `external_portal_ids` | jsonb | `{ imobiliare: "id", storia: "id", olx: "id" }` — populated in S40 |
| `commission_percent` | numeric(5,2) nullable | agent-side default |
| `commission_min_amount` | numeric(10,2) nullable | |
| `metadata` | jsonb default '{}' | extension bucket |
| `created_at`, `updated_at` | | |

Indexes:
- `idx_properties_professional_id`
- `idx_properties_status_active` partial index `WHERE status = 'active'`
- `idx_properties_geom` GIST
- `idx_properties_neighborhood_id`
- `idx_properties_city_trgm` (trigram, for search — enable `pg_trgm`)
- `idx_properties_price_active` on `(asking_price)` partial `WHERE status = 'active'`

**`property_photos`**:
- `id`, `property_id` FK cascade, `url`, `thumbnail_url`, `width`, `height`, `caption`, `position` smallint, `is_cover` boolean, `source` text (`upload | portal_sync`), `created_at`.

**`property_features`**:
- `id`, `property_id` FK cascade, `key` text (from a controlled vocabulary: `elevator`, `ac`, `alarm`, `intercom`, `smart_home`, `furnished`, `appliances`, `storage_unit`, `cellar`), `value` text (`yes | no | <specific>`), `display_order` smallint.

**`property_rooms`**:
- `id`, `property_id` FK cascade, `room_type` (`living | bedroom | kitchen | bathroom | office | dressing | pantry | other`), `name` text, `sqm` numeric(6,2), `orientation` text (`N|S|E|W|NE|NW|SE|SW`), `finish` jsonb, `position` smallint.

**`property_documents`**:
- `id`, `property_id` FK cascade, `document_type` enum (`CF | energy_cert | floor_plan | title_deed | tax_cert | utilities_bill | other`), `name` text, `url` text, `uploaded_by` uuid, `uploaded_at`, `visible_to_client` boolean default false, `metadata` jsonb.
- This is a specialization of the generic `documents` table; link via `document_id` FK nullable so existing `documents` uploads can be "promoted" to property docs, or keep standalone — **choose standalone for simplicity** (less join complexity in seller portal views).

**`property_tags`** (junction M:N to existing `tags` table):
- `property_id` FK cascade, `tag_id` FK cascade, PK = (property_id, tag_id).

### Tasks (in order)

1. Create `lib/db/schema/properties.ts` with all six tables above.
2. Extend `lib/db/schema/_enums.ts` (create if it doesn't exist) with `propertyTypeEnum`, `transactionTypeEnum`, `propertyStatusEnum`, `documentTypeEnum`, `roomTypeEnum`.
3. Add indexes via `.on()` in the table definition or as raw SQL in the migration tail.
4. Enable `CREATE EXTENSION IF NOT EXISTS pg_trgm;` in the migration prelude (for trigram city search).
5. Add RLS policies (see below).
6. Add Supabase Storage bucket `properties/` via hand-written migration suffix (follow pattern of `9900_storage_buckets.sql`): public read for files in active-listing folders, authenticated write scoped to the professional.
7. Storage policy pattern (critical — the bucket policy must NOT leak photos of draft/withdrawn listings):
   ```sql
   -- Read: public, but only for files whose property row is public
   create policy "properties_bucket_public_read" on storage.objects for select
     using (
       bucket_id = 'properties' and
       (storage.foldername(name))[1] in (
         select id::text from public.properties where status in ('active','reserved','sold','rented')
       )
     );
   ```
8. Add `lib/db/queries/re/properties.ts` skeleton (read helpers only — no CRUD actions yet; that's S28).
9. Export new tables from `lib/db/schema.ts`.
10. Generate migration via `npm run db:generate`, rename to `..._session27_properties.sql`, review, apply.
11. Regenerate `types/database.ts`.
12. Add domain types to `types/domain.ts`: `Property`, `PropertyPhoto`, `PropertyRoom`, `PropertyFeature`, `PropertyDocument`, `PropertyWithPhotos`, `PropertyListItem`.

### RLS Policies

```ts
// properties
pgPolicy("properties_professional_all", { /* as above pattern */ }),
pgPolicy("properties_public_select", {
  as: "permissive", for: "select",
  to: [anonRole, authenticatedRole],
  using: sql`${t.status} in ('active','reserved','sold','rented')`,
}),
pgPolicy("properties_client_select", {
  as: "permissive", for: "select",
  to: authenticatedRole,
  using: sql`
    exists (
      select 1 from professional_clients pc
      where pc.professional_id = ${t.professionalId}
        and pc.client_id = ${currentClientIdSql}
        and pc.status = 'active'
    )
  `,
}),

// property_photos, property_features, property_rooms — inherit visibility from parent
pgPolicy("property_photos_public_select", {
  using: sql`exists (select 1 from properties p where p.id = ${t.propertyId} and p.status in ('active','reserved','sold','rented'))`,
}),
// ...analogous for features and rooms

// property_documents — NEVER public; only professional + client with visible_to_client=true
pgPolicy("property_documents_professional_all", { /* professional only */ }),
pgPolicy("property_documents_client_select", {
  using: sql`
    ${t.visibleToClient} = true and
    exists (
      select 1 from properties p
      join professional_clients pc on pc.professional_id = p.professional_id
      where p.id = ${t.propertyId}
        and pc.client_id = ${currentClientIdSql}
        and pc.status = 'active'
    )
  `,
}),
```

### Verification
- `npm run db:push` applies cleanly.
- `SELECT typname FROM pg_type WHERE typname = 'property_status';` returns one row.
- Inserting a row as professional A, switching to professional B, the SELECT returns 0 rows for B.
- Inserting with `status='draft'`, the anon role cannot SELECT it; flipping to `status='active'` makes it visible to anon.
- `SELECT ST_AsGeoJSON(geom) FROM properties LIMIT 1;` works after inserting a property with `ST_MakePoint(lng, lat)`.
- `types/database.ts` regen includes `properties` and all satellites.

### Self-check questions

1. Does the `properties_public_select` policy check `status in ('active', 'reserved', 'sold', 'rented')` and NOT just `'active'`? (Sold/rented need archive visibility; draft/withdrawn/expired stay private.)
2. Is `floor_price` NEVER exposed in any non-professional query? (It's in the row, but S28 server queries must `select` explicit columns that omit it for client/anon contexts.)
3. Does the `updated_at` trigger exist for every new table? (Six tables, six triggers.)
4. Is the Storage bucket policy tight enough? (Test: upload a photo, mark the property `draft`, try to fetch the URL as anon — must 403.)
5. Is `external_portal_ids` a jsonb with sensible defaults `{}`? (S40 will write to this.)

---

## Session 28 — Properties Dashboard (CRUD + Wizard)

### Goal
Give the agent a fast, polished, mobile-responsive UI to create, edit, browse, filter, and manage property listings end-to-end. Enforce `max_listings` plan limit. Support drag-drop photo upload with automatic thumbnails. Cover status transitions and the "featured listing" flag.

### Why this order
With the schema in place (S27), the agent needs to actually create listings before anything downstream (public pages S29, contracts S31, viewings S34, etc.) can be meaningfully demoed or tested.

### Context to Load
- S27 schema files and migrations.
- `lib/actions/services.ts` and `lib/actions/clients.ts` — closest action patterns.
- `app/dashboard/services/page.tsx` — closest existing dashboard module UX.
- `lib/stripe/plans.ts` — where `max_listings` must be added.
- `components/dashboard/clients/` — for DataTable + filter patterns.
- `lib/actions/safe-action.ts` — `authedAction` factory.
- `hooks/use-subscription.ts` — plan gating.
- PRD sections 5.3.1, 5.3.2, 5.3.3.

### Dependencies
- S27 schema live. Mapbox (S26) configured.

### External Services
None new.

### Data Model Changes
- **`lib/stripe/plans.ts`**: add `maxListings` to each plan. Proposed: Solo=20, Growth=75, Team=300, Brokerage=Infinity. Add alongside existing `maxClients` (both enforced independently).
- **`professionals.planLimits` jsonb**: must include `{ maxListings: number }` on write.

### Tasks

1. **Plan limits** — extend `lib/stripe/plans.ts`, `lib/stripe/usage.ts` (`canAddListing(professionalId)` helper, uses `count(*) from properties where professional_id = ? and status != 'draft'`).
2. **Server actions** in `lib/actions/re/properties.ts`:
   - `createProperty(input)` — validates plan limit, geocodes address if lat/lng absent, looks up `neighborhood_id`, inserts row in `status='draft'`.
   - `updateProperty(id, patch)` — update.
   - `publishProperty(id)` — transition to `active`; emits PostHog event `re.property.published`; triggers automation chain `new_property` (later defined in S43).
   - `archiveProperty(id, reason)` — transition to `withdrawn` or `expired`.
   - `markSold(id, transactionId?)` — transition to `sold`, sets `sold_at`.
   - `addPhotos(propertyId, files)` — uploads to Supabase Storage `properties/<propertyId>/<uuid>.jpg`, generates thumbnails via Supabase image transformations (or client-side with `sharp` before upload).
   - `reorderPhotos(propertyId, orderedIds)`.
   - `setCoverPhoto(propertyId, photoId)`.
   - `deletePhoto(photoId)`.
   - `upsertFeatures(propertyId, features[])`.
   - `upsertRooms(propertyId, rooms[])`.
3. **Queries** in `lib/db/queries/re/properties.ts`:
   - `listProperties({ professionalId, filters, sort, page, limit })`.
   - `getProperty(id)` — with photos, features, rooms, neighborhood, cover photo resolved.
   - `countByStatus(professionalId)`.
4. **Routes** under `app/dashboard/_niche/properties/`:
   - `page.tsx` — list with DataTable: columns [cover, title, type, rooms, sqm, price, status, days on market, actions]; filters [status, type, price range, neighborhood, rooms, transaction type, has_exclusive_contract]; sort; bulk actions (change status, add tag, export).
   - `new/page.tsx` — multi-step wizard:
     - Step 1: Type + transaction type + quick address (with map pin drag).
     - Step 2: Core specs (price, sqm, rooms, floor, year, energy class).
     - Step 3: Photos (drag-drop with Uppy-like component, minimum 3 to publish).
     - Step 4: Description + features + rooms breakdown (optional advanced).
     - Step 5: Commission + publishing options.
     - Draft-saved at every step; "Save draft & exit" always available.
   - `[id]/page.tsx` — detail/edit (tabs: Overview | Photos | Rooms | Features | Documents | Activity | Settings). Activity tab shows feed from `contract_activities` (once S32 exists); for now just show create/update timestamps.
   - `[id]/edit/page.tsx` — full form (legacy fallback if wizard feels too constrained).
5. **Components** in `components/dashboard/re/properties/`:
   - `PropertyWizard.tsx` with stepper UI.
   - `PropertyCard.tsx` (reusable: list view + grid view).
   - `PropertyPhotoGrid.tsx` (drag-drop reorder, cover star, delete).
   - `PropertyStatusBadge.tsx`.
   - `PropertyPriceDisplay.tsx` (formats based on professional locale + currency).
   - `PropertyAddressPicker.tsx` (Mapbox geocoder + drag-pin fallback — server-side geocode call).
   - `PropertyFilters.tsx`.
   - `PropertyFeatureEditor.tsx`.
   - `PropertyRoomEditor.tsx`.
6. **Nav**: add `properties` to `components/dashboard/nav-items.ts` under the "_niche" section with a `Building2` Lucide icon.
7. **i18n keys** — add `re.properties.*` namespace to `messages/ro.json` and `messages/en.json`.
8. **Feature flag** — `re_properties_enabled` default ON for everyone (verticalized flag).
9. **PostHog events** — `re.property.created`, `re.property.published`, `re.property.archived`, `re.property.sold`, `re.property.photo_uploaded`.
10. **Search experience** — the list page should have a global search input that trigram-matches `title`, `address_line`, `city`.

### Storage

Bucket path convention: `properties/<property_id>/photos/<uuid>.<ext>` and `properties/<property_id>/docs/<uuid>.<ext>` and `properties/<property_id>/floor_plans/<uuid>.<ext>`.

### Verification
- Create a property via wizard from empty state.
- Reach plan limit (Solo plan: create 20 non-draft properties, 21st blocked with clear error).
- Upload 10 photos, reorder, mark cover — persisted and reflected in UI.
- Publish a property: row flips to `active`, PostHog event fired, `listed_at` populated.
- Filter list by status=active, sort by `price desc`, pagination works.
- Keyboard-navigable, WCAG AA form.
- Mobile (375px width): wizard is usable, list becomes card view.

### Self-check questions

1. Does the plan-limit check run BEFORE the geocoding API call? (Geocoding costs money; don't call it for a request that will be rejected.)
2. When a photo upload fails midway through a batch, does the UI show partial success + retry for failed ones? (Don't ask the user to re-upload the whole set.)
3. When the agent changes `asking_price`, is `price_per_sqm` recomputed automatically (via GENERATED ALWAYS)?
4. Can an agent create a `draft` property without filling every required field? (Draft = loose validation; `active` = strict.)
5. When `status → active`, does the mail/notification pipeline get notified (for S43 automations)? Stub the hook even if S43 isn't done yet — fire a `new_property_published` internal event.

---

## Session 29 — Property Public Pages on the Micro-site

### Goal
Turn an `active` property into a crawlable, share-friendly public page at `<slug>.estatecorepro.app/property/<property_slug>` (or `/[agent-slug]/property/[property_slug]` in dev). SEO-optimized (Schema.org `RealEstateListing`, Open Graph, sitemap entry), with lead capture CTAs that create leads (nucleus) and pre-populated viewing requests (stub for S34).

### Why this order
Once an agent can create listings (S28), the first external thing they want is to share a link. This session delivers that, and simultaneously sets up the lead-ingress path that marketing campaigns (S39) and portal syndications (S40) will drive traffic to.

### Context to Load
- `app/[slug]/page.tsx` and existing section renderers in `components/micro-site/`.
- `lib/db/queries/re/properties.ts` (from S28).
- How Schema.org JSON-LD is emitted (check for existing `JsonLd` component).
- `next-intl` page translation pattern.
- `app/sitemap.ts` / `robots.ts` — extend to include property URLs.
- Nucleus `sections.contact_form` handler — the function that creates a lead on submit; RE uses it with a `source=property_page` and `property_id` in metadata.

### Dependencies
- S27, S28 shipped.

### External Services
None new.

### Tasks

1. **Route** — `app/[slug]/_niche/property/[propertySlug]/page.tsx` (Server Component with ISR, `revalidate = 600`).
2. **Data loader** — `getPublicProperty(agentSlug, propertySlug)` in `lib/db/queries/re/properties.ts`:
   - Joins `properties` → `professionals` (slug match) → `neighborhoods` → photos → features → rooms.
   - Only returns if property `status in ('active','reserved','sold','rented')` and micro-site is published.
   - Strips `floor_price` and any agent-only metadata.
3. **Components** — `components/micro-site/re/`:
   - `PropertyHeroGallery.tsx` — lightbox + slider (use `yet-another-react-lightbox` or `embla-carousel-react`).
   - `PropertyFacts.tsx` — the spec table.
   - `PropertyDescription.tsx`.
   - `PropertyFeaturesList.tsx`.
   - `PropertyRoomsTable.tsx`.
   - `PropertyMap.tsx` (from S26) in a section showing property pin + POIs.
   - `PropertyCostEstimates.tsx`.
   - `PropertyViewingCTA.tsx` — form that creates a lead + stages a viewing request (`metadata.viewing_requested = true`; S34 picks this up).
   - `PropertySimilarListings.tsx` — horizontally scrollable row of other `active` properties from the same agent, sorted by proximity.
   - `PropertyBadges.tsx` — "REZERVAT", "NOU", "VÂNDUT" overlays.
4. **SEO** — generate:
   - `<title>`: `{rooms} camere, {neighborhood}, {city} — {price} {currency} | {agent_name}`.
   - Meta description: first 160 chars of `description_short` or generated template.
   - Open Graph: cover photo, title, description, type=website.
   - Twitter card: summary_large_image.
   - Schema.org JSON-LD `RealEstateListing` (use the `Residence` type with `offers` for sale/rent).
   - Canonical URL.
5. **Sitemap** — extend `app/sitemap.ts` to include all active property URLs across all published professionals. Paginate; use Sanity's `MetadataRoute.Sitemap` protocol.
6. **ISR revalidation** — on `publishProperty`, `updateProperty`, `archiveProperty`, `markSold` actions, call `revalidatePath(`/${agentSlug}/property/${propertySlug}`)` and `revalidatePath(`/${agentSlug}`)`.
7. **Lead CTA handling** — in `lib/actions/re/leads.ts`:
   - `requestViewing(propertyId, payload)` — creates a `leads` row with `source = 'property_page'` and `metadata.property_id`, `metadata.viewing_slot_preferences`. Sends notification to agent. (S34 will wire viewing-specific creation.)
   - `askQuestion(propertyId, payload)` — creates a message draft for the agent (or a lead if the visitor isn't an existing client).
8. **Share buttons** — WhatsApp, Facebook, Email with prefilled content. Copy-link button.
9. **QR code** — generate a QR to this URL server-side via `qrcode` npm package; reused in S39 brochures.
10. **Status-specific UX** — `sold` properties show price as "Vândut la {month} {year}" (no exact number); `reserved` shows "REZERVAT" badge with agent contact.

### Verification
- Published property renders at `/[slug]/property/[propertySlug]` with all sections.
- View source → JSON-LD validates at schema.org validator.
- OG image preview on Slack/Facebook debugger renders correctly.
- Sitemap includes the new URL.
- Submitting the viewing form creates a lead; agent sees it in `/dashboard/leads` and gets a notification.
- Lighthouse score ≥ 90 on mobile for a property page with 10 photos.

### Self-check questions

1. Is `floor_price` guaranteed stripped from the public payload? (Type-level if possible: return a `PublicProperty` type that omits it.)
2. Do reserved/sold properties still render but with appropriate badges? (Social proof value.)
3. Is the ISR revalidation triggered on every status change, not just publish? (Stale pages showing a sold property as active is a credibility killer.)
4. Are the CTAs anti-spam (rate-limited, honeypot, maybe hCaptcha)? Use `publicFormRateLimit` from the nucleus.
5. Does the page work with JavaScript disabled? (Server-rendered content + minimal interactive bits.)

---

## Session 30 — Buyer Search Profiles & Property Matches

### Goal
Let a buyer (either invited client or anonymous visitor who filled a search form) persist search criteria, and periodically (daily) match them against the professional's `active` properties. Send match emails, surface in buyer portal shortcuts, and track what's been shown so we don't repeat ourselves.

### Why this order
By S30, properties exist and clients exist, but there's no connective tissue between them. Matching is a small amount of code that immediately makes the product feel intelligent. It's also a prerequisite for the buyer portal (S42) and for "noile proprietăți potrivite" automation (S43).

### Context to Load
- `lib/db/schema/clients.ts` (to know the FK target).
- `lib/db/schema/properties.ts` (S27).
- `lib/automations/engine.ts` (for the "new property → match → email" hook).
- PRD 4.3 (`buyer_search_profiles`, `property_matches`), 5.9.3 (matching email).

### Dependencies
- S27, S28, S29.

### Data Model

**`buyer_search_profiles`**:
- `id`, `professional_id` FK, `client_id` FK nullable (nullable = anon lead that filled the "Vreau să caut" form on micro-site), `email` (for anon), `phone` nullable, `name` nullable.
- `transaction_type` (`sale | rent | both`).
- `property_types` text[] (multi-select).
- `neighborhoods` uuid[] (FK references to `neighborhoods.id` — soft: validated on write).
- `cities` text[].
- `min_price, max_price, currency`.
- `min_rooms, max_rooms`.
- `min_sqm, max_sqm`.
- `must_have_features` text[] (e.g., `['elevator', 'parking']`).
- `nice_to_have_features` text[].
- `max_travel_minutes_from` jsonb — `{ origin: { lat, lng, address }, mode: 'driving'|'walking'|'transit', minutes: 20 }` for isochrone-based search.
- `urgency` text (`urgent | 1_3_months | 6_plus_months | exploring`).
- `financing` text (`cash | mortgage | cash_and_mortgage | other`).
- `is_active` boolean default true.
- `last_matched_at` timestamptz nullable.
- `match_count` integer default 0.
- `created_at, updated_at`.
- RLS: professional manages; anon can INSERT when referred from micro-site (with rate limit via `publicFormRateLimit`); client can SELECT/UPDATE their own.

**`property_matches`**:
- `id`, `professional_id` FK, `buyer_search_profile_id` FK cascade, `property_id` FK cascade.
- `score` numeric(5,2) — 0..100.
- `score_breakdown` jsonb — `{ price: 100, rooms: 80, location: 70, features: 60, travel: 90 }`.
- `status` text (`new | shown_to_client | dismissed_by_client | interested | viewing_scheduled`).
- `shown_at`, `clicked_at`, `last_status_change_at` timestamptz nullable.
- `created_at`.
- Unique constraint `(buyer_search_profile_id, property_id)` — we don't re-create a match; we update status.

### Tasks

1. Schema files + migration.
2. `lib/re/matching.ts`:
   - `scoreMatch(property, profile)` returning `{ score, breakdown, isMatch }` — deterministic rule-based:
     - Hard filters (transaction_type, property_type, price range, rooms range, sqm range) → if any fails, `isMatch=false`.
     - Soft scoring: each criterion contributes to a 0–100 weighted score.
     - Location: if profile has `neighborhoods[]` → 100 if property is in list, else fallback to city match.
     - Travel: if `max_travel_minutes_from` set → compute `ST_Distance` against isochrone polygon (cached from S26's `isochroneMinutes`).
     - Features: must-haves are hard filter, nice-to-haves contribute soft points.
   - `findMatchesForProperty(propertyId, tx)` → runs against all active profiles for the professional.
   - `findMatchesForProfile(profileId, tx)` → runs against all active properties.
3. Trigger.dev job `trigger/jobs/re/matching-runner.ts`:
   - On `property.published` event → call `findMatchesForProperty`.
   - On `buyer_search_profile.created/updated` → call `findMatchesForProfile`.
   - Daily cron at 06:00 Europe/Bucharest → re-score everything (catches stale scores if property prices change).
4. Emails — add Resend template `re-matching-email.tsx` (listing title, price, 2–3 photos, CTA to property page; branded with professional's colors).
5. Dashboard UI — `app/dashboard/_niche/properties/[id]/matches/page.tsx` showing buyers matched to this property + `app/dashboard/_niche/buyers/page.tsx` showing search profiles.
6. Micro-site lead-magnet integration — public `/[slug]/search` form that creates a `buyer_search_profile` and triggers an immediate match email.
7. Server action `requestBuyerSearch(payload)` (public, rate-limited) that creates both a `lead` (via nucleus leads table) AND a `buyer_search_profile` if the visitor provided search criteria.

### Verification
- Create a buyer profile with `max_price=150000 EUR`, `rooms=2..3`, `city=București`.
- Create an `active` property matching those.
- Match job runs → `property_matches` row exists with `score > 0`.
- Email fires (check Resend dashboard or email preview).
- Dashboard shows matches in both views.

### Self-check questions

1. Is the hard-filter logic correct? (A `max_price=150000` profile must not be shown a 160000 property, period.)
2. Is duplicate suppression working? (If a buyer has seen a property and dismissed it, don't re-email.)
3. Does the daily cron run as `dbAdmin` (service role, bypassing RLS)? It must — jobs don't have a user context.
4. Are email sends throttled by plan (Growth plan allows unlimited; Solo may have a cap)?
5. Does the isochrone call fall back gracefully if Mapbox is down? (Skip the travel criterion, don't fail the match entirely.)

---

## Session 31 — Exclusive Contract Generation

### Goal
Implement the *differentiator* of EstateCore Pro: generate a legally valid Romanian exclusive-representation contract (variants: vânzare, cumpărare, închiriere), populate it from the property + client profile, render it as a branded PDF, store it, manage its lifecycle (draft → sent → signed → active → expiring → expired/renewed).

### Why this order
Upstream of this session, we have properties and clients but no formal relationship tying the agent exclusively to the client on a property. Nothing downstream (activity log S32, signing S33, seller portal S41) is coherent without this anchor.

### Context to Load
- `lib/invoices/pdf.tsx` — the React-PDF pattern to replicate.
- `lib/resend/templates/*.tsx` — email envelope patterns.
- PRD section 5.4 in full — the definitive spec for this module.
- Romanian real estate legislation references (hard-coded clauses from the PRD).
- `lib/db/schema/properties.ts`, `clients.ts`, `professionals.ts`.

### Dependencies
- S27 (properties), clients exist from nucleus.

### External Services
None new in this session (signature in S33).

### Data Model

**`exclusive_contracts`**:
- `id`, `professional_id` FK, `client_id` FK, `property_id` FK nullable (nullable = buyer-side contract, not tied to one property).
- `contract_type` (`sale | purchase | rental | rental_search`).
- `contract_number` (YYYY-NNNN per professional, auto-gen).
- `status` (`draft | sent | viewed | signed | active | expiring_soon | expired | cancelled | renewed | completed`).
- `template_id` — FK or embedded — see below.
- `template_variables_snapshot` jsonb — snapshot of values used to fill the template (for audit).
- `duration_days` smallint — 30/60/90/120/180.
- `start_date` date, `end_date` date (computed: start + duration).
- `commission_percent` numeric(5,2), `commission_min_amount` numeric(12,2), `commission_currency` text default 'EUR'.
- `guaranteed_activities` jsonb — `{ min_viewings: 10, report_frequency: 'weekly', marketing_budget: 500 }`.
- `marketing_channels` text[] — `['imobiliare.ro', 'storia', 'olx', 'social_media', 'email', 'brochure']`.
- `exit_clause` jsonb — `{ min_notice_days: 30, penalty: { type: 'fixed', amount: 500 } }`.
- `pdf_url` text — generated PDF (unsigned, draft).
- `signed_pdf_url` text nullable — populated in S33.
- `signed_at` timestamptz nullable.
- `signed_by` jsonb nullable — `{ client: { signature_id, ip, user_agent, timestamp }, agent: { ... } }`.
- `cancellation_reason` text nullable, `cancelled_at` timestamptz nullable.
- `renewed_from_id` uuid FK to self nullable.
- `metadata` jsonb.
- `created_at, updated_at`.

**`contract_templates`** (shared library of template variants; some system-seeded, some per-professional overrides):
- `id`, `professional_id` FK nullable (NULL = system template), `contract_type`, `locale` (`ro|en`), `name`, `version` int.
- `markdown_source` text — the raw Markdown with `{{merge_tag}}` slots.
- `variable_schema` jsonb — declares required variables and their types.
- `is_default` boolean.
- `is_active` boolean.
- `effective_from` date, `effective_to` date nullable.
- `created_at, updated_at`.

RLS: professional CRUDs own templates; system templates are readable by all authenticated.

### Tasks

1. Schema + migration.
2. **System templates**: seed 3 Romanian templates (sale, purchase, rental) via `supabase/seed.sql` or migration. Use the PRD's clause structure. Templates written in Markdown with `{{professional.full_name}}`, `{{client.full_name}}`, `{{property.address_line}}`, `{{commission_percent}}`, `{{duration_days}}`, etc.
3. **Template engine** — `lib/re/contract-template.ts`:
   - `renderTemplate(template, variables): { markdown, missingVars }`.
   - Uses simple Mustache-like `{{ ... }}` replacement; escapes user input; validates all required vars are present.
4. **PDF renderer** — `lib/re/contract-pdf.tsx`:
   - React-PDF component that takes rendered Markdown → parses via `react-pdf-markdown` or simple heuristic renderer (headings, paragraphs, bullets, bold, signature blocks).
   - Branded header: professional logo, name, license number (if present in `professional.metadata`).
   - Footer: page numbers, contract number, professional ANPC info.
   - Signature block at the end with two signature slots (client, agent) — empty placeholders in draft; filled with names + timestamps after S33.
5. **Server actions** in `lib/actions/re/contracts.ts`:
   - `createContractDraft(input)` — picks template, gathers variables, validates, renders PDF, uploads to Storage `contracts/<contract_id>/draft.pdf`, sets status=`draft`.
   - `updateContractDraft(id, patch)` — re-render PDF on save.
   - `sendContractToClient(id, channel: 'email' | 'portal')` — status=`sent`; sends email with PDF link (unsigned at this stage; signing is S33).
   - `markContractViewed(id)` — called when client opens portal link; status=`viewed`.
   - `cancelContract(id, reason)`.
   - `renewContract(oldId, overrides)` — creates new contract with `renewed_from_id` set.
6. **Lifecycle cron** — Trigger.dev `trigger/jobs/re/contract-expiry-alert.ts`:
   - Daily at 09:00: find contracts where `end_date - now() between 0 and 30 days` and status=`active`; mark `expiring_soon`; send email to agent (and PM notification).
   - On expiry day: mark `expired`; trigger renewal automation.
7. **Dashboard routes**:
   - `app/dashboard/_niche/contracts/page.tsx` — list with status filters + "expires soon" highlight.
   - `app/dashboard/_niche/contracts/new/page.tsx` — creation wizard (pick type → pick client → pick property (if sale) → template → duration → commission → marketing channels → guaranteed activities → review → generate PDF → send).
   - `app/dashboard/_niche/contracts/[id]/page.tsx` — detail view (tabs: Overview | PDF Preview | Activity (S32) | Timeline | Settings).
8. **Components** — `components/dashboard/re/contracts/`:
   - `ContractWizard.tsx`, `ContractStatusBadge.tsx`, `ContractPDFPreview.tsx` (iframe of the PDF), `ContractActivityFeed.tsx` (placeholder for S32), `ContractSignatureStatus.tsx` (placeholder for S33).
9. **Contract number generation** — atomic sequence per professional (add a `contract_sequences` table with row lock, or use a function `next_contract_number(professional_id)`).
10. **Notifications** — agent notified on (sent, viewed, signed, expired, expiring_soon).
11. **Client portal touch-point** — stub: when contract is `sent`, the client's portal dashboard shows a banner "Contract pentru semnare"; the actual signing UX is S33.

### Verification
- Agent creates a sale contract for property X, client Y, 90 days, 3% commission.
- PDF generates correctly, shows all variables filled.
- Send via email: client receives email with PDF link.
- Expiry cron: set a contract's `end_date = now() + 5 days`, run the job manually, observe `expiring_soon` status.
- Renewal flow creates a linked contract.

### Self-check questions

1. Does the template validate that `property_id` is present for `sale` and `rental` contract types but not required for `purchase`?
2. Are the PDF numbers unique per professional, not global?
3. Does the email include unsubscribe / GDPR footer per nucleus email shell?
4. Is the template engine XSS-safe? (Variables must be escaped.)
5. When a contract transitions to `signed` (in S33), does the status automatically move to `active` on the `start_date`? Yes — handled by the daily cron + immediate transition if `start_date <= now()`.

---

## Session 32 — Contract Activity Log (Transparency Module)

### Goal
Make the exclusive contract defensible by logging **every agent action** on it, automatically where possible and manually where necessary, and exposing that log to the seller in their portal. This is the feature that justifies exclusivity.

### Why this order
The contract exists (S31); now every action must be attributable to it. S34–S39 will each emit activity log entries as they're built. Getting the activity model right first avoids retrofitting each module.

### Context to Load
- S31 outputs, especially `exclusive_contracts.id`.
- `lib/notifications/send.ts`.
- PRD section 5.4.3 (detailed list of auto-loggable + manual-loggable activities).

### Dependencies
- S31.

### Data Model

**`contract_activities`**:
- `id`, `contract_id` FK cascade, `professional_id` FK (denormalized for RLS speed).
- `activity_type` enum:
  - Auto: `property_published_on_portal | viewing_scheduled | viewing_completed | viewing_cancelled | viewing_feedback_received | offer_received | email_campaign_sent | social_post_published | brochure_generated | cma_generated | marketing_channel_activated | report_sent`.
  - Manual: `phone_call | networking | property_inspection | consultation | marketing_expense | other`.
- `occurred_at` timestamptz (can differ from `created_at` for backdated manual entries).
- `title` text — short label shown in activity feed.
- `description` text nullable — longer details.
- `source_type` text — `auto | manual`.
- `source_ref` jsonb — e.g., `{ viewing_id: '...' }`, `{ portal: 'imobiliare.ro', listing_id: '...' }`.
- `attachments` jsonb — `[{ url, name, mime }]`.
- `duration_minutes` integer nullable.
- `cost` numeric(10,2) nullable, `cost_currency` text nullable.
- `visibility` text (`client | internal`) default `client`. Internal entries are seller-invisible.
- `created_at, updated_at`, `created_by` uuid.

RLS: professional all; client SELECT where the client owns the property tied to the contract AND `visibility = 'client'`.

### Tasks

1. Schema + migration.
2. **Auto-log emitter** — `lib/re/contract-activity.ts`:
   - `logContractActivity({ contractId, activityType, title, description, sourceRef, visibility })` — called from other modules.
   - Idempotency guard: `sourceRef.key` uniqueness (e.g., `viewing_id` + `activity_type='viewing_completed'` can't double-log).
3. **Hook points** (stubs now; populated in later sessions):
   - When a property is published (S28 hook) → find any active exclusive contract for that property; log `property_published`.
   - When a viewing is scheduled/completed (S34) → log.
   - When an offer is received (S36) → log.
   - When a CMA is generated (S38) → log.
   - When an email campaign is sent (RE-specific campaigns in S39) → log for each property referenced.
   - When portal syndication fires (S40) → log.
4. **Manual-log UI** — `app/dashboard/_niche/contracts/[id]/activity/page.tsx`:
   - Quick-add buttons: "Log phone call", "Log networking", "Log marketing expense".
   - Manual entry form with type, description, occurred_at, duration, cost, attachments.
5. **Agent activity feed component** — `components/dashboard/re/contracts/ContractActivityFeed.tsx` — reverse-chron list; filter by type; export to PDF (hooked to weekly report in S43).
6. **Seller-visible preview** — used later by S41 in seller portal; for now expose `getClientVisibleActivities(contractId)` query that filters `visibility='client'`.
7. **Analytics rollup** — `getContractActivityStats(contractId)` returning `{ total_activities, by_type, marketing_spend_total, viewings_count, offers_count, last_activity_at }` — used by the weekly report in S43.

### Verification
- Manually create 3 activities of different types.
- Publish a property that has an active contract → auto-entry appears.
- Activity feed paginates.
- Export activity feed to PDF shows branded report.
- RLS: client (via portal) sees only `visibility='client'` entries for their own property's contract.

### Self-check questions

1. Is `source_ref` keyed such that idempotent retries don't double-log? (E.g., `{ viewing_id: 'abc', activity_type: 'viewing_completed' }` unique across all entries for a contract.)
2. Are `cost` entries in the professional's currency or the contract's currency? Decide and document — recommend contract currency.
3. When a property is detached from a contract (contract cancelled), do past activities stay? Yes — audit integrity.
4. Is manual entry audit-safe? (`created_by` populated; no retroactive edits without an audit row.)
5. Is the weekly-report query fast enough? (Index on `(contract_id, occurred_at)`.)

---

## Session 33 — Digital Signature Integration

### Goal
Enable legally binding electronic signing of the exclusive contract directly in the platform, via DocuSign (or Autogram as EU-local alternative), with a fallback path for "upload a scanned signed copy". Track the signing flow states and move the contract to `signed`/`active` on completion.

### Why this order
S31 generates the PDF. S32 logs activities. But a draft contract without a signature is a PDF, not a legal agreement. This session closes the loop.

### Context to Load
- S31 outputs and `contracts` state machine.
- DocuSign Developer Sandbox API docs (eSignature REST API v2.1).
- PRD 5.4.2.

### Dependencies
- S31, S32.

### External Services
- **DocuSign Developer Account** — create, obtain Integration Key, User ID, Account ID, RSA keypair for JWT Grant auth. (Autogram.sk as alternative for EU Romanian flavor — evaluate quickly, DocuSign has broader UX familiarity.)

### Tasks

1. **Env vars** (listed in §3 above).
2. **Provider abstraction** — `lib/re/signature/provider.ts`:
   ```ts
   interface SignatureProvider {
     createEnvelope(opts): Promise<{ envelopeId, signUrl }>;
     getEnvelopeStatus(id): Promise<EnvelopeStatus>;
     downloadSignedDocument(id): Promise<Buffer>;
     verifyWebhookSignature(body, signature): boolean;
   }
   ```
3. **DocuSign implementation** — `lib/re/signature/docusign.ts` using `docusign-esign` npm package with JWT Grant.
4. **Upload fallback** — `lib/re/signature/upload-fallback.ts` — agent uploads a scanned/photographed signed document; validated as PDF; stored; status → `signed`.
5. **Schema additions** to `exclusive_contracts`:
   - `signature_provider` text (`docusign | autogram | upload`).
   - `envelope_id` text nullable.
   - `signature_request_url` text nullable (client-facing URL from provider).
   - `signature_events` jsonb — audit trail `[{ event, timestamp, actor, ip }]`.
6. **Server actions** in `lib/actions/re/contracts.ts`:
   - `initiateSignature(contractId)` — called after draft is finalized. Creates envelope via provider; stores envelope_id; sets status=`sent`; emails client with signing link (or guides them to portal).
   - `handleSignatureWebhook(payload)` — called by webhook route; validates signature; updates contract status on events (`sent → viewed → completed → signed`).
   - `uploadSignedDocument(contractId, file)` — fallback path.
   - `voidSignature(contractId, reason)` — cancel envelope.
7. **Webhook route** — `app/api/webhooks/docusign/route.ts` (signed by DocuSign HMAC); update contract status; log activity entry `contract_signed` into S32.
8. **Client-facing signing page** — `app/portal/contracts/[id]/sign/page.tsx` (inside portal): shows contract preview + "Sign now" button that launches DocuSign embedded signing (via `clickwrap` or Embedded Signing URL).
9. **UI in dashboard** — add a "Send for signature" button on `/dashboard/_niche/contracts/[id]` when status=`draft`. Show status pipeline (Draft → Sent → Viewed → Signed → Active).
10. **Automatic `status='active'` transition** — on signed, if `start_date <= today`, set `status='active'` immediately; otherwise defer to cron.
11. **Legal validity note** — `docs/signature-compliance.md`: brief note that DocuSign (QES level via EU Trust Services) and Autogram provide eIDAS-compliant signatures valid in Romania.
12. **Update contract PDF** post-signing to embed signature certificate (DocuSign returns a combined PDF with the signature certificate appended).

### Verification
- Send a test contract to a client; client signs via DocuSign Demo; webhook fires; contract → `signed`; activity log entry created; signed PDF downloadable.
- Upload-fallback path works and sets status=`signed`.
- Voiding an envelope reverts status appropriately.

### Self-check questions

1. Is the webhook signature verified on every call? (Critical — otherwise anyone can spoof "signed" events.)
2. Does the signed PDF get stored in Supabase Storage with RLS such that only the professional and the signatory client can download?
3. Is there a retry mechanism for webhook failures? (DocuSign retries; we need idempotent handlers.)
4. Are template changes after signing blocked? (Contract state `signed` → all edit paths disabled.)
5. Is there an audit trail of who initiated the signature and from which IP?

---

## Session 34 — Viewings Management

### Goal
Full viewing lifecycle: schedule (by agent or by buyer via property page / micro-site), send reminders, check in, capture post-viewing feedback automatically, surface feedback in the seller's portal (the big "transparency win"), log each event to the contract activity feed (S32).

### Why this order
Viewings are the most frequent real-estate activity. They're the bread-and-butter event that the seller must see in their portal (S41). They also feed back into property matching (S30) and the contract activity log (S32).

### Context to Load
- Nucleus `lib/db/schema/scheduling.ts` (`availability_slots`, `appointments`) — viewings extend or polymorphically reference appointments.
- Nucleus `lib/actions/appointments.ts` and `lib/re/contract-activity.ts` (S32).
- Nucleus Trigger.dev reminder job pattern from S11.
- PRD 5.7.1, 5.7.2.

### Dependencies
- S27 (property), S31/S32 (contract activity hooks).

### Data Model

**`viewings`**:
- `id`, `professional_id` FK, `property_id` FK.
- `appointment_id` FK → `appointments` nullable (when the viewing is on the agent's calendar; otherwise standalone — e.g., asynchronous open-house check-ins).
- `buyer_client_id` FK → clients nullable (nullable if it's an anonymous lead-based viewer; backfilled if they convert to client).
- `buyer_lead_id` FK → leads nullable.
- `scheduled_start`, `scheduled_end` timestamptz.
- `actual_start`, `actual_end` timestamptz nullable (check-in/check-out).
- `status` (`scheduled | confirmed | in_progress | completed | cancelled | no_show`).
- `cancellation_reason` text nullable, `cancelled_by` text nullable (`agent | buyer | seller`).
- `attendee_count` smallint default 1.
- `notes` text nullable (agent-only).
- `introducing_agent_id` uuid FK → professionals nullable (when a different agent is bringing the buyer; matters for co-broke commission).
- `source` text (`property_page | portal | manual | buyer_matching | walk_in`).
- `metadata` jsonb.
- `created_at, updated_at`.

**`viewing_feedback`**:
- `id`, `viewing_id` FK cascade, `professional_id` FK.
- `submitted_by` text (`buyer | agent_on_behalf`).
- `overall_rating` smallint (1..5).
- `price_perception` text (`too_high | fair | good_value | too_low`).
- `liked` text nullable, `disliked` text nullable.
- `interest_level` text (`very_interested | interested | maybe | not_interested`).
- `wants_offer` boolean nullable.
- `additional_visits_wanted` boolean default false.
- `share_with_seller` boolean default true.
- `raw_response` jsonb — full form submission for audit.
- `submitted_at` timestamptz.
- RLS: professional all; client can view feedback on own viewing; seller sees feedback where `share_with_seller=true` AND owns the property.

### Tasks

1. Schema + migration (include `check (scheduled_end > scheduled_start)` constraint).
2. **Actions** in `lib/actions/re/viewings.ts`:
   - `scheduleViewing({ propertyId, buyerClientId?, buyerLeadId?, start, end, notes })`.
   - `requestViewingAsBuyer({ propertyId, preferences })` — public endpoint, creates `buyer_lead`, viewing in status `scheduled`, notifies agent.
   - `confirmViewing(id)`, `rescheduleViewing(id, newStart, newEnd)`, `cancelViewing(id, reason, by)`.
   - `checkInViewing(id, attendeeCount?)` — sets `actual_start`, status → `in_progress`.
   - `completeViewing(id)` — sets `actual_end`, status → `completed`, triggers feedback request automation.
   - `submitViewingFeedback(id, payload)`.
3. **Calendar integration** — when a viewing is scheduled and linked to an `appointment`, populate the appointment with `type='viewing'`, `metadata.property_id`.
4. **Reminder emails** — reuse nucleus scheduling reminders (24h + 1h via Trigger.dev); add RE-specific template `re-viewing-reminder.tsx` with property thumbnail + address + map link.
5. **Feedback request automation** — Trigger.dev job `trigger/jobs/re/viewing-feedback-request.ts`:
   - 2h after `completeViewing`: send email to buyer with feedback form link.
   - 48h later: reminder if not completed.
6. **Feedback form** — reuse nucleus forms system: seed a system form template `re.viewing_feedback` with the schema matching `viewing_feedback` columns. Form responses auto-create `viewing_feedback` rows.
7. **Dashboard UI**:
   - `app/dashboard/_niche/viewings/page.tsx` — list + calendar toggle; filters [property, status, agent, date range].
   - `app/dashboard/_niche/viewings/[id]/page.tsx` — detail with check-in/out, feedback tab, buyer profile link.
   - Quick-schedule modal from the property detail page.
8. **Micro-site integration** — `PropertyViewingCTA` in S29 now creates a `viewing` row with status=`scheduled` (pending agent confirmation); buyer receives email.
9. **Activity log hook** — on every `schedule/complete/cancel/feedback` → `logContractActivity(...)`.
10. **Attribution** — when a viewing completes, update the associated lead's `lead_activities`.
11. **Route-optimal daily view** — `app/dashboard/_niche/viewings/today/page.tsx` showing today's viewings on a Mapbox map with an optimized route order (nearest-neighbor heuristic is fine for MVP).

### Verification
- Schedule a viewing from dashboard; both agent and buyer receive confirmation.
- 24h reminder fires.
- Check-in → in_progress; Complete → completed; feedback email sends 2h later.
- Buyer submits feedback via portal form; `viewing_feedback` row created; seller portal (S41) shows feedback (if `share_with_seller=true`).
- Cancelling releases the time slot for other bookings.

### Self-check questions

1. Can two viewings be scheduled on the same time for the same agent? (Block via conflict check using `availability_slots`.)
2. When the buyer requests a viewing via property page, is the agent's availability respected? (Offer only available slots, or let them request any slot and the agent confirms.)
3. Are feedback responses GDPR-compliant? (Buyer consent via form; `share_with_seller` controls propagation.)
4. Is the 2h-after-completion delay accurate with timezone handling?
5. Can a single property have overlapping viewings (e.g., group viewing)? — decide: yes, use `attendee_count`; no double-booking on time range but single viewing event.

---

## Session 35 — Open Houses

### Goal
Special-case events where many potential buyers visit a property in a single time window. Public RSVP page, check-in form, auto-lead creation for each attendee, post-event summary report, activity log entries.

### Why this order
Open houses are lighter-weight than regular viewings but share infrastructure. Building on S34 means we reuse the viewing engine while layering the public-RSVP and group-check-in UX on top.

### Context to Load
- S34 outputs.
- Public page patterns from S29.
- Form engine for RSVP capture.

### Dependencies
- S34.

### Data Model

**`open_houses`**:
- `id`, `professional_id` FK, `property_id` FK.
- `start_datetime`, `end_datetime`.
- `capacity` integer nullable.
- `description` text.
- `public_slug` text UNIQUE per professional.
- `rsvp_required` boolean default true.
- `status` (`scheduled | live | completed | cancelled`).
- `attendance_count` integer default 0.
- `created_at, updated_at`.

**`open_house_rsvps`**:
- `id`, `open_house_id` FK cascade, `name`, `email`, `phone`, `arrival_time` timestamptz nullable.
- `checked_in_at` nullable, `interest_level` text nullable, `converted_to_lead_id` FK nullable.
- `notes` text nullable.

RLS: RSVPs anon-INSERT (rate-limited), professional-SELECT/UPDATE.

### Tasks

1. Schema + migration.
2. Actions: `createOpenHouse`, `updateOpenHouse`, `cancelOpenHouse`, `publishOpenHouse`, `checkInAttendee`, `convertAttendeeToLead`.
3. Public route `app/[slug]/_niche/open-house/[openHouseSlug]/page.tsx` — event page with property preview + RSVP form (CAPTCHA-protected).
4. Check-in page (agent-only, mobile-optimized) `app/dashboard/_niche/open-houses/[id]/check-in/page.tsx` — quick form to capture attendees walking in without RSVP.
5. Dashboard list/detail in `app/dashboard/_niche/open-houses/`.
6. Post-event report (cron 24h after `end_datetime`): email to agent with attendance stats, list of attendees, auto-converted leads, click-to-follow-up actions.
7. Activity-log hook on `create`, `publish`, `complete`.
8. Social-share CTAs on the public page.
9. Reuse `viewings` for the actual viewing action — each checked-in attendee can be promoted to a `viewings.completed` entry tied to the open-house.

### Verification
- Create open house; publish; RSVP as a visitor; appear in agent dashboard.
- Check in at event; auto-create leads for attendees.
- 24h after: summary email arrives.

### Self-check
1. Is the public RSVP page rate-limited against form spam?
2. Can you cancel an open house after RSVPs exist — and do attendees get notified?
3. Does the capacity field enforce? (Allow waitlist as extension.)
4. Is the check-in form touchscreen-friendly on a phone?

---

## Session 36 — Offers Management

### Goal
Track purchase offers on properties: submit, negotiate (counter-offers), accept/reject, convert accepted offer → transaction (S37). Handle seller transparency (seller sees offers in portal) and buyer tracking (buyer sees offer status in portal).

### Why this order
Between viewings (S34) and transactions (S37), offers are the hinge. An offer is proof that a viewing converted. Accepted offers cascade into transactions.

### Context to Load
- S27 (property), S34 (viewing link), S32 (activity log).
- PRD 4.3 (`offers`), 5.5 (pipeline contextual).

### Dependencies
- S27, S32, S34.

### Data Model

**`offers`**:
- `id`, `professional_id` FK, `property_id` FK, `buyer_client_id` FK nullable, `buyer_lead_id` FK nullable.
- `viewing_id` FK nullable — the viewing that led to this offer.
- `offer_amount` numeric(14,2), `currency` text.
- `offer_conditions` jsonb — `{ finance_contingency: true, closing_date: 'YYYY-MM-DD', deposit: 5000, inclusions: ['mobilier', 'parcare'], exclusions: [] }`.
- `status` (`submitted | counter_offered | accepted | rejected | withdrawn | expired`).
- `submitted_at`, `responded_at`, `expires_at` timestamptz.
- `seller_response_note` text nullable.
- `counter_offer_parent_id` FK to self nullable (for tracking negotiation chain).
- `metadata` jsonb.
- RLS: professional all; involved client SELECT own; seller (property owner) SELECT where `property.professional_id = my professional AND I am the property's seller client`.

### Tasks

1. Schema + migration.
2. Actions in `lib/actions/re/offers.ts`: `submitOffer`, `counterOffer`, `acceptOffer`, `rejectOffer`, `withdrawOffer`, `expireOffer` (cron).
3. Auto-status transitions:
   - On `acceptOffer`: property → `reserved`; other open offers → `expired`; trigger transaction creation (stub S37); log contract activity.
   - On `rejectOffer` / `counterOffer`: chain tracked.
4. Dashboard UI: list page filtered by property, detail view with negotiation timeline.
5. Portal UIs (stubs for S41/S42): buyer sees own offers, seller sees incoming offers on their property.
6. Email templates: offer submitted, counter-offered, accepted, rejected.
7. PDF of offer (for archival / share-by-email) — simple React-PDF doc.
8. Activity log hooks on every state change.

### Verification
- Submit offer → seller notified; accept → property reserved, other offers auto-expired; counter → chain row created.
- Expiry cron: offer past `expires_at` → `expired`.

### Self-check
1. Are there race conditions on accept? (Lock the property row via `SELECT ... FOR UPDATE` in the transaction.)
2. Does accepting an offer create a draft transaction (S37) even if not clicked in UI? Stub — a placeholder `transactionId` on the offer is populated.
3. Is the `counter_offer_parent_id` chain queryable performantly? Add recursive CTE helper.

---

## Session 37 — Real-Estate Transaction Pipeline

### Goal
Give the agent a Kanban board of in-flight transactions with RE-specific stages (Evaluare → Contract Exclusiv → Marketing Activ → Vizionări → Ofertă/Negociere → Precontract → În Curs Notar → Finalizat / Pierdut), each stage with a checklist of required documents and tasks.

### Why this order
Offers (S36) trigger transaction creation. This session gives the agent a visual workflow for the rest of the deal.

### Context to Load
- PRD 5.5, 5.5.1.
- Nucleus lead-pipeline Kanban from S9 (for drag-drop pattern, `@dnd-kit`).
- `professional_clients` junction.

### Dependencies
- S27, S31, S34, S36.

### Data Model

**`transactions`**:
- `id`, `professional_id` FK, `property_id` FK, `seller_client_id` FK nullable, `buyer_client_id` FK nullable.
- `accepted_offer_id` FK nullable.
- `exclusive_contract_id` FK nullable (sell-side exclusivity).
- `cooperating_professional_id` FK nullable (co-broke agent).
- `stage_id` FK → transaction_stages.
- `status` (`in_progress | completed | lost | paused`).
- `expected_close_date`, `actual_close_date` date nullable.
- `final_price` numeric(14,2) nullable, `currency` text.
- `commission_total` numeric(12,2) nullable, `commission_split` jsonb — `{ listing_agent: 1.5, buyer_agent: 1.5 }`.
- `loss_reason` text nullable.
- `metadata` jsonb.
- RLS: professional all; client view if seller or buyer.

**`transaction_stages`** — per-professional customizable; seed defaults matching PRD table.

**`transaction_documents`**:
- `id`, `transaction_id` FK cascade.
- `document_type` (`CF | tax_cert | identity_card | income_proof | precontract | deed | utility_paid | other`).
- `required_for_stage_id` FK nullable — the stage that requires this doc.
- `status` (`required | uploaded | verified | rejected`).
- `url` text nullable, `uploaded_by`, `uploaded_at`, `verified_by`, `verified_at`, `rejection_reason`.
- `visible_to_client` boolean default true.

**`transaction_tasks`**:
- `id`, `transaction_id` FK, `stage_id` FK nullable, `title`, `assignee_id` FK professionals, `due_date`, `status` (`open | done`), `notes`.

### Tasks

1. Schema + migration; seed default stages; seed default stage-checklists (e.g., "Precontract" stage requires `CF`, `tax_cert`, `precontract`).
2. Actions: `createTransactionFromOffer`, `moveTransactionStage`, `completeTransaction`, `loseTransaction`, `uploadTransactionDocument`, `verifyDocument`, `createTransactionTask`.
3. Dashboard routes `app/dashboard/_niche/transactions/`:
   - `page.tsx` — Kanban across stages; card shows property, parties, expected close.
   - `[id]/page.tsx` — tabs: Overview | Timeline | Documents | Tasks | Commission | Activity.
4. Auto-stage progression hooks:
   - Offer accepted → stage = "Precontract" (or appropriate).
   - Precontract signed → stage = "În Curs Notar".
   - Final deed uploaded → stage = "Finalizat".
5. Activity log hooks.
6. Client portal views (stubs for S41/S42 — timeline of own transaction with non-technical "what's happening now" copy).
7. Commission tracking: populate `commission_records` (lightweight — full tracking in S43).

### Verification
- From accepted offer → transaction created → drag across stages.
- Upload required docs; marking them verified unlocks stage progression.
- Lost transaction requires loss reason.
- Buyer and seller portal both reflect transaction state.

### Self-check
1. Is the stage progression enforced (can't skip stages without override) or free-form? Recommend free-form with "suggested next" badge.
2. Does completing a transaction auto-update property status → `sold`?
3. Are commission records created only on `completed`? Yes, commit-once via unique constraint.
4. Client-facing timeline uses friendly copy, not internal stage names?

---

## Session 38 — CMA Tool (Comparative Market Analysis)

### Goal
Let the agent generate a professional, branded CMA report for a property: select comparable properties, apply per-criterion adjustments, compute recommended price interval, export to PDF, share interactive version in seller portal (the #1 tool for justifying listing price).

### Why this order
CMA is used (a) at pre-exclusive conversation to anchor price, (b) at price-adjustment discussions later. It reads from properties (S27) and neighborhoods (S26); it writes to `portal_reports` (S41). Now is the right time — all upstream data is present.

### Context to Load
- PRD 5.6 in full.
- S26 (geo) and S27 (properties).
- Nucleus PDF patterns.

### Dependencies
- S26, S27.

### Data Model

**`cma_reports`**:
- `id`, `professional_id` FK, `property_id` FK.
- `title`, `prepared_for_client_id` FK nullable.
- `market_radius_m` integer, `time_window_days` integer (how far back for comps).
- `recommended_price_min`, `recommended_price_max`, `currency`.
- `methodology_notes` text.
- `pdf_url` text nullable.
- `portal_view_token` text UNIQUE — for tokenized sharing without requiring portal login.
- `generated_at` timestamptz, `regenerated_from_id` FK nullable.
- `metadata` jsonb.

**`cma_comparables`**:
- `id`, `cma_report_id` FK cascade.
- `source` text (`own_listings | sold_records | portal_scrape | manual`).
- `source_ref` text — id or URL.
- `address` text, `lat`, `lng`, `neighborhood_id` FK.
- `property_type`, `rooms`, `sqm`, `floor`, `year_built`, `energy_class`.
- `price` numeric, `price_per_sqm` numeric, `transaction_type`, `listed_at`, `sold_at` nullable, `days_on_market` int nullable.
- `distance_m` numeric (computed).
- `adjustments` jsonb — `[{ criterion, rationale, pct_or_amount }]`.
- `adjusted_price` numeric (computed from `price` + adjustments).
- `weight` numeric (relevance weight 0..1).
- `included_in_report` boolean default true.

### Tasks

1. Schema + migration.
2. `lib/re/cma/comparables.ts`:
   - `findComparables(propertyId, { radiusM, timeWindowDays, maxResults })` — query own listings + external data (MVP: own listings only; future: portal-scrape data).
   - Scoring: distance + same-type + sqm-proximity + year-built-proximity.
3. `lib/re/cma/adjustments.ts`:
   - Configurable adjustment rules (per-floor, per-orientation, per-renovation, per-parking) with defaults; agent can override.
4. `lib/re/cma/pdf.tsx` — React-PDF with:
   - Cover (professional branding, subject property summary, date).
   - Subject overview.
   - Comparables table with adjustments.
   - Price chart (p/sqm distribution in zone, subject highlighted).
   - Time-on-market chart.
   - Recommended price interval.
5. Actions: `generateCMA`, `updateCMAComparables`, `regenerateCMA`, `shareCMAWithClient`.
6. Dashboard route `app/dashboard/_niche/cma/[id]/page.tsx` with a comparables picker (map + list), adjustment editor, live recomputation.
7. Portal interactive view — `app/portal/_niche/cma/[token]/page.tsx` (public or token-auth): same charts + interactive comparables.
8. Integrate with contract activity log (`cma_generated`).

### Verification
- Generate CMA for property X → PDF branded, with 5 comps, recommended interval.
- Adjusting a comparable's adjustments re-computes the recommended range.
- Token-share link works in incognito.

### Self-check
1. Is the own-listings-as-comparables query fast? (Index on `neighborhood_id, property_type, sold_at`.)
2. Does the adjustment math handle currency mismatches between subject and comparable? Normalize to one currency.
3. Is `portal_view_token` sufficiently random (use `crypto.randomBytes(32).toString('base64url')`)?
4. Do deleted comparables not break existing PDFs? (PDFs are regenerated, so stale PDFs on disk are fine but the DB row shouldn't be hard-deleted; soft-delete.)

---

## Session 39 — Real-Estate Marketing Kit

### Goal
Property-scoped marketing production: branded brochure PDFs, social media post templates populated from property data, RE-specific email templates (new listing, price reduction, open house, just sold, monthly newsletter), matching emails to buyer-search-profile segments (building on S30).

### Why this order
By now the product has everything to market. This session turns the agent's data into polished deliverables and fires up the "demonstrable output" layer.

### Context to Load
- Nucleus Marketing Kit (S17): `email_campaigns`, `social_templates`, `lead_magnets`.
- S27 property schema; S26 map rendering (for brochure maps).
- PRD 5.9.

### Dependencies
- S26, S27, S29, S30.

### Tasks

1. **Property brochure generator** — `lib/re/brochure-pdf.tsx` (React-PDF):
   - Template variants: minimal, luxury, commercial, land.
   - Sections: cover (hero photo + address + price), gallery (up to 8 photos), floor plan (if exists), specs table, description, map + neighborhood stats, features list, agent contact, QR code to public URL.
2. Actions: `generateBrochure(propertyId, template)` → PDF uploaded to Storage; URL returned.
3. **Social media generator** — `lib/re/social-generator.ts`:
   - Canvas-based PNG export (reuse nucleus pattern from S17).
   - RE templates: `new_listing`, `price_reduction`, `open_house`, `just_sold`, `testimonial`, `market_report`.
   - Auto-populate with property data.
4. **RE email campaign templates** — React Email templates under `emails/re/`:
   - `re-new-listing.tsx` — sent to buyer-search-profile segment matching.
   - `re-open-house.tsx` — invitation.
   - `re-price-reduction.tsx` — alert to interested buyers.
   - `re-just-sold.tsx` — testimonial / market momentum.
   - `re-monthly-market-report.tsx` — neighborhood stats digest.
   - `re-matching-weekly.tsx` — buyer's top 5 matches of the week.
5. **Campaign recipient segmentation** — extend nucleus email_campaigns to support segment rules: tags, buyer-search-profile match criteria, recent interaction filters.
6. **RE email merge tags** — add to template renderer: `{{property.address}}`, `{{property.price}}`, `{{property.cover_photo_url}}`, `{{public_url}}`, `{{viewing_cta_url}}`.
7. Dashboard UI: add a "Marketing" tab to property detail page with one-click brochure + social posts + email blast.
8. Activity log hook per marketing action.
9. Stripe feature-gate: Solo plan gets simple brochure + social only; Growth+ gets email campaigns + matching.

### Verification
- Generate a brochure → PDF looks professional, branded.
- Create a social post → PNG downloadable + sharable.
- Send a new-listing email → arrives with merged property data.
- Activity log reflects each action.

### Self-check
1. Are PDF and PNG exports accessible (font legibility, contrast ratios)?
2. Is the merge-tag renderer safe from template injection (variables escaped)?
3. Do campaigns respect per-plan email send limits?

---

## Session 40 — Portal Syndications (Imobiliare.ro, Storia.ro, OLX)

### Goal
Automated listing publication to major Romanian real estate portals via XML feeds or APIs. Single source of truth stays in EstateCore Pro; remote portals get synchronized. Track channel attribution (where did each lead come from).

### Why this order
Late enough that listings are rock-solid (S27/S28). Before E2E testing (S44) because syndication is a high-risk integration.

### Context to Load
- PRD 5.9.5.
- Partner documentation (Imobiliare.ro / Storia / OLX — obtain via pre-session research).

### Dependencies
- S27, S28.

### External Services
- Partnership accounts with each portal; test feed credentials.

### Data Model

**`portal_feeds`**:
- `id`, `professional_id` FK, `portal_code` text (`imobiliare | storia | olx`).
- `is_enabled` boolean, `credentials` jsonb (encrypted at rest via Supabase pgcrypto or stored in Supabase Vault).
- `feed_url` text — ours that the portal polls (for XML-feed portals) OR null (for API-push portals).
- `last_sync_at`, `last_sync_status`, `last_error` text nullable.

**`portal_listings`**:
- `id`, `portal_feed_id` FK cascade, `property_id` FK cascade.
- `external_id` text — the portal's listing ID.
- `external_url` text.
- `status` (`pending | published | updating | failed | removed`).
- `last_synced_at`, `synced_version` int.

### Tasks

1. Schema + migration.
2. `lib/re/feeds/`:
   - `xml.ts` — common XML builder.
   - `imobiliare.ts` — mapper from `Property` → Imobiliare XML schema (research the schema; PRD says "XML feed standard"). Publish/unpublish/update.
   - `storia.ts` — same.
   - `olx.ts` — same.
3. Feed endpoint — `app/api/feeds/[portalCode]/[feedToken]/route.ts` — returns current XML for that professional's properties. Authed via feed-specific token stored on `portal_feeds`.
4. For API-push portals: sync-on-change — on property publish/update/archive, enqueue Trigger.dev `feed-publisher` job per enabled portal.
5. Lead attribution: inbound contact from a portal (via email parsing or the portal's lead-forwarding API) creates a `lead` with `source=<portal>`. If the portal supports webhooks, implement `app/api/webhooks/portals/[portalCode]/route.ts`.
6. Dashboard UI `app/dashboard/_niche/properties/[id]/syndications/page.tsx` — per-property view of where it's published + status per portal + republish button.
7. Settings UI `app/dashboard/settings/integrations/` — enable each portal, enter credentials, verify connection.
8. Daily reconciliation cron: check that each property's portal state matches DB; flag drift.

### Verification
- Enable Imobiliare feed → property appears on Imobiliare within sync window.
- Update price → sync fires → updated on portal.
- Archive property → removed from portal.
- Inbound lead tagged with source.

### Self-check
1. Are portal credentials encrypted (not plaintext jsonb)? Use `pgcrypto` or Supabase Vault.
2. Is the feed endpoint rate-limited and authenticated?
3. What happens if a portal returns an error on sync? Exponential retry + agent notification after 3 failures.
4. Is there a manual "unpublish everywhere" emergency button?

---

## Session 41 — Seller Portal (The Transparency Dashboard)

### Goal
The portal view that *proves the exclusivity was worth it*. A seller logs in and sees: property status, recent viewings, feedback, offers, marketing actions, the last weekly report, agent's activity log, documents. This is the emotional payoff of the entire platform.

### Why this order
All upstream data is now live (properties, contracts, viewings, offers, CMA, marketing, activity log). Now we surface it to the seller in an emotionally resonant UI.

### Context to Load
- PRD section 6 in full — the client-side spec.
- Existing `app/portal/` layout and nucleus portal shell (S7).
- S32 activity log, S34 viewings, S36 offers.

### Dependencies
- S27–S40.

### Data Model

**`portal_reports`** (auto-generated weekly reports persisted for the seller to view anytime):
- `id`, `professional_id` FK, `exclusive_contract_id` FK, `property_id` FK, `client_id` FK.
- `period_start`, `period_end` date.
- `summary` jsonb — stats snapshot.
- `narrative` text — agent-customizable summary text (AI-assisted in future; MVP is templated).
- `pdf_url` text.
- `portal_url` text (interactive).
- `generated_at`, `emailed_at`, `opened_at` timestamptz.
- `version` int.

### Tasks

1. Schema + migration for `portal_reports` (activity is a lot of reads from S32/S34/S36).
2. Routes:
   - `app/portal/_niche/seller/page.tsx` — landing: shows the seller's active properties + contract status + latest report link.
   - `app/portal/_niche/seller/property/[propertyId]/page.tsx` — detail: sections for Overview (status, key metrics), Activity Timeline, Viewings + Feedback, Offers, Marketing, Documents, Reports, Messages (reuse nucleus), CMA (from S38), Contract (from S31).
   - `app/portal/_niche/seller/reports/[reportId]/page.tsx` — interactive report.
3. Components `components/portal/re/seller/`:
   - `PropertyStatusCard.tsx`, `ViewingsTimeline.tsx` (with feedback blurbs), `OffersStack.tsx` (hide seller-internal offer details appropriately), `MarketingActionsFeed.tsx`, `DocumentsPanel.tsx`, `WeeklyReportEmbed.tsx`, `CMAPresentation.tsx`.
4. **Server queries** — a dedicated `lib/db/queries/re/portal-seller.ts` that returns aggregated views. MUST go through RLS so the seller only sees their own data.
5. **Activity feed**: reads `contract_activities` filtered to `visibility='client'`.
6. **Notifications**: when anything new happens (new viewing, new feedback, new offer, new report), push notification + email + in-app.
7. **Onboarding wizard**: first time a seller logs in, walk them through the UI.

### Verification
- As an invited seller, log in → see properties, viewings, offers, activity, reports.
- Agent logs an activity → seller sees it in real time (Supabase Realtime subscription).
- Reports render in both PDF and interactive HTML.
- No agent-internal data leaked (e.g., `floor_price`, internal notes).

### Self-check
1. Does the RLS let the seller see ONLY their own property's data, even within the same professional's client base?
2. Are agent-private fields (`floor_price`, agent notes on offers, `internal` activity entries) ALWAYS filtered server-side, not client-side?
3. Is the UI warm and human — copy like "Agentul a publicat proprietatea pe Imobiliare.ro acum 2 ore" not "activity_type: property_published_on_portal"?
4. Mobile-first? Most sellers will open this on phones.

---

## Session 42 — Buyer Portal

### Goal
A buyer logs in and sees their shortlist, comparator, saved searches + matches, viewing history, offers, and documents. Frictionless shopping experience with the agent's curation front-and-center.

### Why this order
Parallel to S41. Having both portals complete means the E2E test in S44 can hit both personas.

### Context to Load
- PRD section 6.2.
- S30 (search profiles, matches), S34, S36, S38.

### Dependencies
- S27–S40.

### Data Model

**`buyer_shortlist`** (simple junction):
- `id`, `client_id` FK, `professional_id` FK, `property_id` FK, `notes`, `rating` smallint (1..5), `added_at`, `removed_at` nullable.
- RLS: client manages own.

**`property_views`** (lightweight view-tracking for buyer activity analytics):
- `client_id`, `property_id`, `viewed_at`. No PII on anon views, only tracked once authenticated.

### Tasks

1. Schema + migration.
2. Routes:
   - `app/portal/_niche/buyer/page.tsx` — dashboard with shortlist carousel, saved searches, new matches.
   - `app/portal/_niche/buyer/shortlist/page.tsx` — grid with notes + rating.
   - `app/portal/_niche/buyer/compare/page.tsx` — side-by-side comparator (up to 4 properties).
   - `app/portal/_niche/buyer/searches/page.tsx` — saved searches + edit.
   - `app/portal/_niche/buyer/viewings/page.tsx` — past + upcoming.
   - `app/portal/_niche/buyer/offers/page.tsx` — submitted offers + status.
   - `app/portal/_niche/buyer/mortgage/page.tsx` — mortgage calculator (simple: amount, rate, term → monthly payment + total interest).
3. Components `components/portal/re/buyer/`:
   - `ShortlistGrid.tsx`, `PropertyComparator.tsx`, `SearchProfileEditor.tsx`, `MortgageCalculator.tsx`, `PropertyMatchCard.tsx`.
4. Actions: `addToShortlist`, `removeFromShortlist`, `rateShortlistItem`, `saveSearchProfile`, `updateSearchProfile`.
5. Real-time: when agent adds a property to the buyer's curated list, it appears live.

### Verification
- Buyer can shortlist, unshortlist, rate, compare.
- Saved search updates trigger new matches.
- Mortgage calculator produces correct amortization.
- Agent-curated properties appear distinctly.

### Self-check
1. Is the shortlist capped (e.g., 50 items per client) to prevent abuse?
2. Does the comparator handle different currencies across properties?
3. Is the mortgage calculator client-side-only (no server roundtrip)?

---

## Session 43 — RE Automations, Analytics & Commission Tracking

### Goal
The glue: register all RE-specific automation triggers, build the weekly-seller-report automation, add RE-specific analytics KPIs to the dashboard, implement commission tracking (agent bookkeeping — no payment processing per PRD 5.15).

### Why this order
Automations need the events they respond to — by S43, all domain events exist. Analytics need data — by S43, there's enough. Commission tracking reads from completed transactions (S37).

### Context to Load
- Nucleus automation engine (S18).
- Nucleus analytics (S19).
- PRD 5.12, 5.13, 5.15.

### Dependencies
- S26–S42.

### Data Model

**`commission_records`**:
- `id`, `professional_id` FK, `transaction_id` FK unique, `exclusive_contract_id` FK nullable.
- `commission_amount`, `currency`, `commission_percent`.
- `split` jsonb — `{ listing: { agent_id, amount }, buyer: { agent_id, amount } }`.
- `status` (`earned | invoiced | collected | disputed | written_off`).
- `invoice_id` FK → `invoices` nullable — linking to nucleus invoice module.
- `earned_at`, `invoiced_at`, `collected_at` timestamptz nullable.
- `notes` text.

### Tasks

1. Schema + migration for `commission_records`.
2. **Automation triggers** (register in nucleus engine):
   - `property_published`, `property_price_changed`, `property_inactive_X_days`.
   - `viewing_completed`, `viewing_feedback_received`, `offer_received`, `offer_accepted`.
   - `contract_signed`, `contract_expiring_X_days`, `contract_expired`.
   - `transaction_stage_changed`, `transaction_completed`.
3. **Automation actions** (new RE-specific):
   - `generate_activity_report_pdf`, `publish_to_portal`, `create_matching_email_batch`, `trigger_portal_resync`, `adjust_property_price`, `create_transaction_task`, `alert_contract_expiry`.
4. **Pre-built workflow templates** per PRD 5.12:
   - Nurture lead from property page (immediate email → 3d follow-up → 7d CMA offer → 14d testimonial).
   - Post-viewing (feedback → 2d follow-up → 5d offer suggestion).
   - Contract expiry (30d alert → 15d activity report → 7d renewal proposal).
   - Post-transaction (thank you → 30d NPS → 90d testimonial request → 1y anniversary).
5. **Weekly seller report** Trigger.dev job `trigger/jobs/re/weekly-seller-report.ts`:
   - Cron: Fridays 10:00 local time (professional's timezone).
   - For each active exclusive contract: aggregate activities from S32 over the past 7 days; generate `portal_reports` row; render PDF via `lib/re/reports/weekly-activity.tsx`; email to seller; store in portal.
6. **RE-specific analytics**:
   - KPI cards: active listings, exclusive contracts active, contracts expiring 30d, viewings this week, offers pipeline, days-on-market average, conversion (lead → viewing → offer → sale).
   - Chart: listings funnel; price-to-final-price spread; source attribution pie.
   - Export to PDF/CSV (reuse nucleus).
7. **Commission tracking**:
   - On `transaction_completed` → create commission_record.
   - Dashboard `app/dashboard/_niche/commissions/page.tsx`: list with status filters, total owed / earned / collected.
   - Link to create invoice from commission (reusing nucleus invoice module).
8. **Referral chain** (simple): `client.metadata.referred_by_client_id` — track and display in client profile.

### Verification
- Publish a property → automation chain fires as expected.
- Weekly report cron runs; seller receives PDF + portal link.
- Analytics page shows all new KPIs.
- Completing a transaction creates a commission record; converting to invoice populates the invoice correctly.

### Self-check
1. Do automation chains respect per-professional rate limits? (Avoid spamming.)
2. Is the weekly-report cron timezone-aware per professional? (Use `professional.timezone`.)
3. Are commission splits math-correct when multiple agents are involved?
4. Does the dashboard correctly scope analytics to the professional (RLS enforced in queries)?

---

## Session 44 — End-to-End Testing & Quality Gate

### Goal
Comprehensive Playwright test suite covering the golden paths of each RE module, regression-proof the platform, hit the browser from both agent and client personas, verify emails render, validate PDF outputs. This is the session the user explicitly flagged as the priority.

### Why this order
Must come after all modules exist. Cannot come earlier — E2E tests would be rewritten constantly.

### Context to Load
- Existing `tests/e2e/smoke.spec.ts`, `playwright.config.ts`, `tests/fixtures/auth.setup.ts`.
- All modules S26–S43.
- Nucleus Playwright conventions from S25.

### Dependencies
- S26–S43.

### Tasks

1. **Test fixtures**:
   - `fixtures/re/agent.setup.ts` — seeded professional with a few properties, clients, contracts.
   - `fixtures/re/seller-client.setup.ts`, `fixtures/re/buyer-client.setup.ts` — signed-in client sessions.
   - Mock/stub external services: Mapbox (intercept network), DocuSign (mock provider), portal feeds (no-op).
2. **Golden-path specs** (one file per module):
   - `re/properties.spec.ts` — create property via wizard; edit; publish; archive.
   - `re/property-public.spec.ts` — visit public page; submit viewing CTA; confirm lead created.
   - `re/contracts.spec.ts` — generate draft; send for signature (mocked); verify state transitions.
   - `re/viewings.spec.ts` — schedule; check-in; complete; feedback submission appears in seller portal.
   - `re/offers.spec.ts` — submit; counter; accept → property reserved.
   - `re/transactions.spec.ts` — drag through pipeline; complete; commission appears.
   - `re/cma.spec.ts` — generate CMA; verify PDF download; verify portal share link.
   - `re/matching.spec.ts` — create buyer profile; publish matching property; verify match email.
   - `re/seller-portal.spec.ts` — seller sees all transparent data; no leaked agent-private fields.
   - `re/buyer-portal.spec.ts` — shortlist, compare, search profile updates.
   - `re/marketing.spec.ts` — generate brochure, social post, email campaign.
   - `re/syndication.spec.ts` — enable portal, verify feed XML contains property, archive → removed.
3. **RLS regression tests** — programmatic SQL-level tests in `tests/rls/`:
   - Each tenant table: attempt read/write as wrong professional → reject.
   - Seller: attempt to read another seller's data → reject.
   - Anon: attempt to read draft/private data → reject.
4. **Email visual tests** — snapshot each email via the `/api/emails/preview/[template]` route; diff against baseline.
5. **PDF visual tests** — render each PDF (contract, CMA, brochure, weekly report) to PNG; compare to baseline (pixel tolerance).
6. **Accessibility audit** — axe-playwright on every major page; WCAG 2.1 AA.
7. **Performance** — Lighthouse CI run against the public property page; score ≥ 90 mobile.
8. **Security**:
   - Content-Security-Policy headers added.
   - Rate-limit tests on public endpoints.
   - SQL injection prove-it attempts on search fields.
9. **Migration test** — fresh DB → all migrations apply → seed data → smoke test passes.

### Verification
- `npm run test:e2e` passes with 100% of specs green.
- RLS tests 100% green.
- Visual diffs: 0 baseline violations.
- Lighthouse: ≥ 90 mobile/desktop on public pages.
- axe: 0 critical/serious violations.

### Self-check
1. Are tests deterministic (no flaky clocks, no network races)?
2. Are test fixtures isolated per test (no cross-test pollution)?
3. Are external service mocks faithful (same shapes as real responses)?
4. Does the RLS test suite catch a regression if someone accidentally opens a policy?
5. Is there a CI workflow (`.github/workflows/e2e.yml`) running this on every PR?

---

## Session 45 — Credentials, API Keys & Go-Live Readiness

### Goal
The session where we collect every credential, configure every external service for production, and produce a deployment runbook. The user's explicit ask: "we need to test end to end and to obtain all the credentials and api-keys".

### Why this order
Last. All modules must exist before we finalize their real credentials.

### Context to Load
- `docs/api-keys-setup.md` (existing — extend).
- `docs/analysis-api-keys.md` (existing — extend).
- `docs/cost-model.md` (existing — update with RE-specific costs).
- `lib/env.ts` (full env schema).

### Dependencies
- S26–S44.

### Tasks

1. **Service-by-service checklist** (for each: create account, note plan/tier, capture keys, rotate defaults, verify):
   - Clerk (Production instance, custom domain for sign-in, webhook signing secret, organization public metadata schema).
   - Supabase (Production project in EU region, PITR enabled, PostGIS enabled, service-role key secured, storage bucket policies reviewed, seed-data uploaded).
   - Stripe (Live mode, products for each RE plan, prices in EUR + RON, tax rates configured, webhook endpoint with live signing secret, Customer Portal customized, tax IDs collection, subscription metadata on `professional.id`).
   - Resend (Custom domain verified with SPF/DKIM/DMARC, per-plan send quotas, suppression list imported).
   - Upstash Redis (Production DB, multi-region if going to UE).
   - Trigger.dev (Production project, env vars synced separately, schedule enablement verified).
   - Sentry (Project created, release tracking wired, source maps uploaded in build).
   - PostHog (EU cloud, feature flags defined per plan, consent-based init).
   - Mapbox (Production token with usage quota, domain allowlist).
   - DocuSign (Production account, go-live process completed, JWT consent granted per user).
   - Imobiliare.ro / Storia / OLX (partner accounts, feed URLs registered, test listings validated).
2. **Env vars consolidation** — `.env.production.example` committed to repo with placeholders and comments; real values in Vercel encrypted env; `lib/env.ts` validates all.
3. **Deployment runbook** — `docs/DEPLOYMENT.md`:
   - Vercel project setup (domains, env vars, build settings, ISR cache, cron secrets).
   - Supabase migration apply procedure (preview branch → staging → production).
   - Cutover plan (pre-checks, DNS, post-checks).
   - Rollback plan.
4. **Monitoring & alerting**:
   - Sentry alert rules (error rate spike, new issue, perf regression).
   - PostHog alerts (conversion drop).
   - Uptime monitoring (BetterStack / UptimeRobot pinging `/api/health`).
   - Supabase alerts (DB CPU, storage usage).
   - Stripe alerts (webhook failures, churn).
   - Log drains to a central location (if required).
5. **Business operations setup**:
   - Terms & conditions + Privacy Policy in `/legal/` routes (finalize from templates).
   - Cookie consent banner.
   - GDPR data-processing agreement template.
   - ANPC (Romanian consumer protection) footer links.
6. **Backup & recovery**:
   - Supabase PITR verified (restore drill on staging).
   - Export cron for critical tables (client + contract + transaction).
7. **Security review**:
   - Secrets scan on repo (git-secrets / truffleHog).
   - Dependency audit (`npm audit`; fix or justify highs).
   - CSP header finalized.
   - Rate limits verified on every public endpoint.
8. **Final smoke** on production:
   - Sign up as professional → verify email → subscribe to Growth plan → create a property → publish → visit public URL → submit viewing CTA as anon → confirm lead in dashboard → invite a test seller → they log in → see property status.
9. **Handoff documentation**:
   - `docs/README.md` — product description, architecture overview.
   - `docs/operations-handbook.md` — who to call when what breaks.
   - `docs/feature-matrix.md` — final inventory of delivered features mapped to PRD sections.
10. **Tag release** — `git tag v1.0.0`; changelog published.

### Verification
- Every env var in production.
- All external webhooks verified live (Clerk, Stripe, DocuSign, portals).
- Signup-to-publish flow completes on production.
- Monitoring dashboards populated with real traffic from smoke test.
- Backups verified.

### Self-check
1. Is any credential stored in code, git history, or `.env` committed? (None should be.)
2. Are test/dev credentials fully separated from production?
3. Is there a documented process to rotate any single key in < 30 minutes?
4. Is the team ready to support an on-call rotation?
5. Is there a kill-switch feature flag for each major RE module? (In case of bug in prod, disable without deploy.)

---

# After S45 — Day-2 Operations

This plan delivers a fully functional CRM. Beyond it:

- **AI features** (PRD §8) — description generation, smart matching, pricing advisor, chatbot — roadmapped to v1.1.
- **Mobile native app** (PRD §7.5 Faza 2) — React Native / Expo — v1.2.
- **ANCPI / e-Terra** cadastre lookup integration — v1.2.
- **Multi-language expansion** — MG / HU / DE — v1.3.
- **Whitelabel / broker plan** — v1.3.

---

# Appendices

## A. Task-tracking suggestion

Use GitHub Issues / Linear with labels `session/26` through `session/45`. Each session's task list above maps one-to-one to tickets.

## B. Commit messages

Follow the observed pattern: `session26: postgis + neighborhoods`, `session27: properties schema`, etc.

## C. When Claude Code gets stuck

- If a migration won't apply: check for existing conflicting table/policy; use `DROP IF EXISTS` only in development; in production, write a corrective migration.
- If RLS appears to block a legit action: test the policy against the `currentProfessionalIdSql` subquery by running the policy's `using` expression in psql with `SET LOCAL ROLE authenticated` and a set `request.jwt.claims`.
- If a Trigger.dev job fails: check the Trigger.dev dashboard env vars (they are managed separately from Vercel's); verify `DATABASE_URL` on the job runner is the DIRECT connection, not pooler.
- If an external API integration is blocking progress: scaffold the abstraction with an `upload-fallback` or mock, ship the rest of the session, return to the integration later.

## D. How to measure "fully functional"

Success definition: a real Romanian real estate agent can, end-to-end, from a signup on the marketing page:
1. Subscribe to a plan.
2. Build their micro-site in < 1 hour.
3. Add their first property in < 20 minutes.
4. Invite a proprietar (seller) who receives an intuitive portal invitation.
5. Generate and send an exclusive contract for digital signature.
6. Track 10 viewings with automated feedback capture.
7. Receive and present offers.
8. Close the transaction with full document trail.
9. Auto-generate a weekly report the seller actually reads (`opened_at` populated).
10. Monitor commissions earned vs collected.

If every item above works on production with a single paid tenant, S45 is complete and the product is in pre-alpha → alpha.

---

**End of EstateCore Pro Delta Implementation Plan v1.0**

*Prepared as a sequential, dependency-ordered companion to `nucleus-Implementation-Plan.md` and `EstateCorePro-PRD-v1.0.md`. Execute S26 → S45 in order. No session may be skipped. Every session is committable in isolation.*
