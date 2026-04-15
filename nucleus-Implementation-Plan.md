# CorePro — CRM Boilerplate for Liberal Professionals

## Implementation Plan for Claude Code Sessions

**Version:** 1.1
**Date:** April 2026
**Purpose:** Abstractized CRM platform boilerplate where `X = any liberal professional` (trainer, real estate agent, nutritionist, lawyer, etc.)
**Tech Stack:** Next.js 16 (App Router, React 19) • Supabase (PostgreSQL + RLS + Realtime + Storage) • Drizzle ORM • Clerk (native Third-Party Auth) • Stripe • Tailwind v4 + shadcn/ui • Resend + React Email • Trigger.dev v4 • PostHog • Sentry • Upstash (rate limit) • Vercel

> **Stack decisions locked in v1.1 (April 2026):**
> 1. **Drizzle + supabase-js side-by-side** — Drizzle for typed schema/queries in Server Components, Actions, and Trigger jobs; supabase-js for Realtime, Storage, and client-side reads. RLS enforced via `rphlmr/drizzle-supabase-rls` transaction pattern (`SET LOCAL ROLE authenticated` + JWT claims). Prisma was evaluated and rejected (heavier, slower cold starts on edge/serverless).
> 2. **Clerk native Third-Party Auth** with Supabase — NOT the deprecated JWT-template flow. RLS policies reference `auth.jwt() ->> 'sub'` (Clerk user id) and `auth.jwt() -> 'org_id'`.
> 3. **`@dnd-kit` over `@hello-pangea/dnd`** for Kanban (pangea is feature-frozen, no grid support).
> 4. **`@react-pdf/renderer` over Puppeteer** for invoice PDFs (Puppeteer cold starts exceed Vercel serverless timeouts).
> 5. **`next-safe-action`** for all Server Actions (typed auth/error plumbing via Zod).
> 6. **Sentry + Upstash Ratelimit** added from Session 1 — observability + abuse protection are not optional in a production CRM.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Common Abstractions Extracted](#2-common-abstractions-extracted)
3. [Session-by-Session Implementation Plan](#3-session-by-session-implementation-plan)
4. [Placeholder Conventions](#4-placeholder-conventions)
5. [Post-Boilerplate: Niche Specialization Strategy](#5-post-boilerplate-niche-specialization-strategy)

---

## 1. Architecture Overview

### 1.1 The B2B2C Model (Universal)

```
Professional (pays subscription) ──► Platform ◄── Client (free access)
         │                                              │
    Dashboard + CRM + Tools                    Portal + Tracking + Messaging
         │                                              │
    Micro-Site (public, branded)              Onboarding + Forms + Documents
```

**Core Tenant Model:**
- **Professional** = the paying user (trainer, agent, consultant, etc.)
- **Client** = the professional's customer (free access via invitation or micro-site)
- **Organization** = Clerk org wrapping one professional + their team + their clients
- **Multi-tenant isolation** = Supabase RLS on every table, scoped by `professional_id`

### 1.2 Universal Tech Stack Justification

| Layer | Technology | Role |
|-------|-----------|------|
| Frontend | Next.js 16 (App Router, React 19) | SSR/SSG micro-sites, RSC, edge runtime |
| Styling | Tailwind CSS v4 + shadcn/ui | Design system (CSS-first `@theme`), rapid dev |
| Auth | Clerk (v7, Core 3) | Multi-tenant, social login, orgs, RBAC — native Third-Party Auth for Supabase |
| Database | Supabase (PostgreSQL) | RLS, realtime, storage, edge functions |
| ORM / Query layer | Drizzle ORM | Typed schema + queries in Server Components / Actions / Trigger jobs. Source of truth for schema; `drizzle-kit` generates migrations into `supabase/migrations/` |
| DB client (realtime/storage) | `@supabase/supabase-js` + `@supabase/ssr` | Realtime subscriptions, Storage uploads/signed URLs, client-side reads scoped by RLS |
| File Storage | Supabase Storage | Documents, images, media |
| Payments | Stripe (v22 SDK) | Professional subscriptions only |
| Server Actions wrapper | `next-safe-action` | Typed + validated (Zod) Server Actions, uniform auth/error plumbing |
| Transactional Email | Resend + React Email v5 | Branded transactional templates |
| Real-time | Supabase Realtime | Chat, notifications, presence |
| Background Jobs | Trigger.dev v4 | Automations, reminders, reports, long-running tasks (CSV, PDF batch) |
| Drag & drop | `@dnd-kit/core` + `@dnd-kit/sortable` | Kanban, sortable lists (replaces `@hello-pangea/dnd`) |
| PDF generation | `@react-pdf/renderer` | Invoice + report PDFs without serverless cold-start issues |
| Rate limiting | Upstash Redis + `@upstash/ratelimit` | Auth, webhooks, public form endpoints |
| Observability | Sentry (`@sentry/nextjs`) | Error + performance tracing |
| Env validation | `@t3-oss/env-nextjs` | Build-time env var typing via Zod |
| Analytics | PostHog | Product analytics, feature flags, session replay |
| Deployment | Vercel | Edge, ISR, image optimization |

### 1.3 Project Structure (Final Target)

```
core-pro/
├── app/                          # Next.js App Router
│   ├── (marketing)/              # Landing page, pricing, blog
│   │   ├── page.tsx
│   │   ├── pricing/page.tsx
│   │   └── blog/
│   ├── (auth)/                   # Clerk auth pages
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   ├── sign-up/[[...sign-up]]/page.tsx
│   │   └── layout.tsx
│   ├── dashboard/                # Professional dashboard (protected)
│   │   ├── layout.tsx            # Sidebar + topbar + org context
│   │   ├── page.tsx              # KPI cards + activity feed
│   │   ├── clients/              # CRM core
│   │   │   ├── page.tsx          # Client list + filters + bulk actions
│   │   │   └── [id]/page.tsx     # Client profile (tabbed)
│   │   ├── leads/                # Lead pipeline (Kanban)
│   │   │   └── page.tsx
│   │   ├── services/             # Services/offerings CRUD
│   │   │   └── page.tsx
│   │   ├── calendar/             # Scheduling + availability
│   │   │   └── page.tsx
│   │   ├── messages/             # Real-time chat
│   │   │   └── page.tsx
│   │   ├── forms/                # Form builder
│   │   │   ├── page.tsx
│   │   │   └── [id]/edit/page.tsx
│   │   ├── automations/          # Workflow engine
│   │   │   └── page.tsx
│   │   ├── marketing/            # Marketing kit
│   │   │   └── page.tsx
│   │   ├── analytics/            # Reports + metrics
│   │   │   └── page.tsx
│   │   ├── documents/            # Document management
│   │   │   └── page.tsx
│   │   ├── invoices/             # Invoice tracking (no payment processing)
│   │   │   └── page.tsx
│   │   ├── site-builder/         # Micro-site editor
│   │   │   └── page.tsx
│   │   ├── settings/             # Profile, billing, branding, integrations
│   │   │   └── page.tsx
│   │   └── _niche/               # ⬅ PLACEHOLDER: niche-specific modules
│   │       └── README.md
│   ├── portal/                   # Client portal (protected)
│   │   ├── layout.tsx            # Branded with professional's colors/logo
│   │   ├── page.tsx              # Client dashboard
│   │   ├── messages/page.tsx     # Chat with professional
│   │   ├── documents/page.tsx    # Upload/download documents
│   │   ├── forms/page.tsx        # Fill assigned forms
│   │   ├── progress/page.tsx     # Progress tracking (generic)
│   │   └── _niche/               # ⬅ PLACEHOLDER: niche-specific portal pages
│   │       └── README.md
│   ├── [slug]/                   # Public micro-site (ISR/SSG)
│   │   ├── page.tsx              # Micro-site homepage
│   │   └── _niche/               # ⬅ PLACEHOLDER: niche-specific public pages
│   │       └── README.md
│   └── api/                      # API routes + webhooks
│       ├── webhooks/
│       │   ├── stripe/route.ts
│       │   └── clerk/route.ts
│       └── [...]/
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── dashboard/                # Dashboard-specific components
│   ├── portal/                   # Portal-specific components
│   ├── marketing/                # Marketing page components
│   └── shared/                   # Cross-cutting components
├── lib/
│   ├── db/                       # Drizzle ORM
│   │   ├── schema.ts             # Source of truth for tables + pgPolicy RLS
│   │   ├── client.ts             # User-scoped + service-role drizzle clients
│   │   ├── rls.ts                # withRLS() transaction helper (Clerk JWT → set_config + SET ROLE)
│   │   └── queries/              # Typed query helpers per entity
│   ├── supabase/
│   │   ├── client.ts             # Browser client (Realtime, Storage, client reads)
│   │   ├── server.ts             # Server client (cookies, RSC) — uses Clerk TP Auth token
│   │   ├── admin.ts              # Service role client (webhooks, cron)
│   │   └── middleware.ts         # Auth middleware helper
│   ├── stripe/
│   │   ├── client.ts
│   │   ├── plans.ts              # Plan definitions
│   │   └── webhooks.ts
│   ├── clerk/
│   │   └── helpers.ts
│   ├── resend/
│   │   └── client.ts
│   ├── triggers/                 # Trigger.dev v4 jobs
│   │   └── index.ts
│   ├── ratelimit/
│   │   └── index.ts              # Upstash ratelimit instances (auth, webhooks, public)
│   ├── sentry/
│   │   └── index.ts
│   ├── actions/                  # next-safe-action clients + shared action definitions
│   │   └── safe-action.ts        # authedAction, publicAction factories
│   ├── env.ts                    # @t3-oss/env-nextjs typed env
│   ├── utils.ts
│   └── constants.ts
├── hooks/
│   ├── use-professional.ts       # Current professional context
│   ├── use-realtime.ts           # Supabase realtime subscriptions
│   ├── use-subscription.ts       # Stripe plan/limits
│   └── use-notifications.ts
├── types/
│   ├── database.ts               # Generated from Supabase
│   ├── api.ts
│   └── domain.ts                 # Business domain types
├── supabase/
│   ├── migrations/               # SQL migrations (ordered) — mostly generated by drizzle-kit; hand-written for extensions, RLS policies, storage buckets, triggers
│   ├── seed.sql                  # Dev seed data
│   └── config.toml
├── drizzle.config.ts             # drizzle-kit config (generates into supabase/migrations/)
├── emails/                       # React Email templates
│   ├── welcome.tsx
│   ├── invitation.tsx
│   └── notification.tsx
├── trigger/                      # Trigger.dev job definitions
│   └── jobs/
├── public/
├── middleware.ts                  # Clerk + routing middleware
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.local.example
```

---

## 2. Common Abstractions Extracted

Both PRDs share these universal CRM modules. Each is documented here as a specification for implementation.

### 2.1 Core Entities (Database Schema)

```sql
-- ============================================
-- PROFESSIONALS (the paying tenant)
-- ============================================
professionals
  id              uuid PK (= Clerk user_id)
  clerk_org_id    text UNIQUE
  email           text NOT NULL
  full_name       text NOT NULL
  phone           text
  bio             text
  avatar_url      text
  specialization  text[]
  certifications  text[]
  timezone        text DEFAULT 'Europe/Bucharest'
  locale          text DEFAULT 'ro'
  currency        text DEFAULT 'EUR'
  stripe_customer_id     text
  stripe_subscription_id text
  plan            text DEFAULT 'starter'  -- starter | growth | pro | enterprise
  plan_limits     jsonb  -- { max_clients, max_storage_mb, features[] }
  branding        jsonb  -- { primary_color, secondary_color, logo_url, font }
  onboarding_completed boolean DEFAULT false
  created_at      timestamptz DEFAULT now()
  updated_at      timestamptz DEFAULT now()

-- ============================================
-- CLIENTS (free users, belong to a professional)
-- ============================================
clients
  id              uuid PK (= Clerk user_id)
  email           text NOT NULL
  full_name       text NOT NULL
  phone           text
  avatar_url      text
  date_of_birth   date
  locale          text DEFAULT 'ro'
  metadata        jsonb  -- niche-specific data (health info, budget, etc.)
  created_at      timestamptz DEFAULT now()
  updated_at      timestamptz DEFAULT now()

-- ============================================
-- PROFESSIONAL-CLIENT RELATIONSHIP (junction)
-- ============================================
professional_clients
  id              uuid PK DEFAULT gen_random_uuid()
  professional_id uuid FK → professionals NOT NULL
  client_id       uuid FK → clients NOT NULL
  status          text DEFAULT 'active'  -- active | paused | inactive | archived
  role            text DEFAULT 'client'  -- client | lead (converted)
  source          text  -- micro-site | referral | manual | import
  start_date      date DEFAULT CURRENT_DATE
  end_date        date
  notes           text  -- internal, invisible to client
  metadata        jsonb  -- niche-specific relationship data
  created_at      timestamptz DEFAULT now()
  UNIQUE(professional_id, client_id)

-- ============================================
-- TAGS & SEGMENTATION
-- ============================================
tags
  id              uuid PK DEFAULT gen_random_uuid()
  professional_id uuid FK → professionals NOT NULL
  name            text NOT NULL
  color           text DEFAULT '#6366f1'
  created_at      timestamptz DEFAULT now()
  UNIQUE(professional_id, name)

client_tags
  client_id       uuid FK → clients
  tag_id          uuid FK → tags
  PRIMARY KEY (client_id, tag_id)

-- ============================================
-- LEADS & PIPELINE
-- ============================================
lead_stages
  id              uuid PK DEFAULT gen_random_uuid()
  professional_id uuid FK → professionals NOT NULL
  name            text NOT NULL
  position        integer NOT NULL  -- ordering
  color           text
  is_default      boolean DEFAULT false  -- first stage for new leads
  is_won          boolean DEFAULT false
  is_lost         boolean DEFAULT false
  created_at      timestamptz DEFAULT now()

leads
  id              uuid PK DEFAULT gen_random_uuid()
  professional_id uuid FK → professionals NOT NULL
  stage_id        uuid FK → lead_stages NOT NULL
  full_name       text NOT NULL
  email           text
  phone           text
  source          text  -- micro-site | referral | social | manual | portal
  score           integer DEFAULT 0  -- qualification score
  notes           text
  metadata        jsonb  -- niche-specific lead data
  converted_client_id uuid FK → clients  -- when converted
  created_at      timestamptz DEFAULT now()
  updated_at      timestamptz DEFAULT now()

lead_activities
  id              uuid PK DEFAULT gen_random_uuid()
  lead_id         uuid FK → leads NOT NULL
  type            text NOT NULL  -- note | email | call | stage_change | form_submitted
  description     text
  metadata        jsonb
  created_at      timestamptz DEFAULT now()

-- ============================================
-- SERVICES / OFFERINGS
-- ============================================
services
  id              uuid PK DEFAULT gen_random_uuid()
  professional_id uuid FK → professionals NOT NULL
  name            text NOT NULL
  description     text
  price           decimal(10,2)
  currency        text DEFAULT 'EUR'
  duration_minutes integer  -- for session-based services
  is_active       boolean DEFAULT true
  metadata        jsonb  -- niche-specific service data
  created_at      timestamptz DEFAULT now()

-- ============================================
-- SCHEDULING & APPOINTMENTS
-- ============================================
availability_slots
  id              uuid PK DEFAULT gen_random_uuid()
  professional_id uuid FK → professionals NOT NULL
  day_of_week     integer  -- 0=Sunday, 6=Saturday
  start_time      time NOT NULL
  end_time        time NOT NULL
  is_active       boolean DEFAULT true

appointments
  id              uuid PK DEFAULT gen_random_uuid()
  professional_id uuid FK → professionals NOT NULL
  client_id       uuid FK → clients
  service_id      uuid FK → services
  title           text NOT NULL
  description     text
  start_at        timestamptz NOT NULL
  end_at          timestamptz NOT NULL
  status          text DEFAULT 'scheduled'  -- scheduled | confirmed | completed | cancelled | no_show
  location        text  -- physical address or video link
  type            text DEFAULT 'in_person'  -- in_person | online | phone
  notes           text
  metadata        jsonb
  external_calendar_id text  -- Google Calendar / iCal sync ID
  created_at      timestamptz DEFAULT now()

-- ============================================
-- MESSAGING
-- ============================================
conversations
  id              uuid PK DEFAULT gen_random_uuid()
  professional_id uuid FK → professionals NOT NULL
  client_id       uuid FK → clients NOT NULL
  last_message_at timestamptz
  created_at      timestamptz DEFAULT now()
  UNIQUE(professional_id, client_id)

messages
  id              uuid PK DEFAULT gen_random_uuid()
  conversation_id uuid FK → conversations NOT NULL
  sender_id       uuid NOT NULL  -- professional or client user_id
  sender_role     text NOT NULL  -- professional | client
  content         text
  type            text DEFAULT 'text'  -- text | image | document | voice
  media_url       text
  read_at         timestamptz
  created_at      timestamptz DEFAULT now()

-- ============================================
-- FORMS & QUESTIONNAIRES
-- ============================================
forms
  id              uuid PK DEFAULT gen_random_uuid()
  professional_id uuid FK → professionals NOT NULL
  title           text NOT NULL
  description     text
  schema          jsonb NOT NULL  -- JSON form schema { fields: [...] }
  is_template     boolean DEFAULT false
  is_active       boolean DEFAULT true
  created_at      timestamptz DEFAULT now()

form_assignments
  id              uuid PK DEFAULT gen_random_uuid()
  form_id         uuid FK → forms NOT NULL
  client_id       uuid FK → clients NOT NULL
  professional_id uuid FK → professionals NOT NULL
  status          text DEFAULT 'pending'  -- pending | completed | expired
  due_date        timestamptz
  created_at      timestamptz DEFAULT now()

form_responses
  id              uuid PK DEFAULT gen_random_uuid()
  form_id         uuid FK → forms NOT NULL
  client_id       uuid FK → clients NOT NULL
  assignment_id   uuid FK → form_assignments
  data            jsonb NOT NULL  -- response data matching schema
  submitted_at    timestamptz DEFAULT now()

-- ============================================
-- DOCUMENTS
-- ============================================
documents
  id              uuid PK DEFAULT gen_random_uuid()
  professional_id uuid FK → professionals NOT NULL
  client_id       uuid FK → clients  -- null = professional's own
  uploaded_by     uuid NOT NULL  -- user_id of uploader
  name            text NOT NULL
  file_url        text NOT NULL  -- Supabase Storage path
  file_type       text  -- pdf | image | doc | other
  file_size       integer
  category        text  -- niche-defined categories
  metadata        jsonb
  created_at      timestamptz DEFAULT now()

-- ============================================
-- NOTIFICATIONS
-- ============================================
notifications
  id              uuid PK DEFAULT gen_random_uuid()
  user_id         uuid NOT NULL  -- professional or client
  type            text NOT NULL  -- message | appointment | form | lead | system
  title           text NOT NULL
  body            text
  link            text  -- in-app route
  read_at         timestamptz
  metadata        jsonb
  created_at      timestamptz DEFAULT now()

-- ============================================
-- AUTOMATIONS / WORKFLOWS
-- ============================================
automations
  id              uuid PK DEFAULT gen_random_uuid()
  professional_id uuid FK → professionals NOT NULL
  name            text NOT NULL
  trigger_type    text NOT NULL  -- new_client | new_lead | form_submitted | client_inactive | appointment_completed | custom
  trigger_config  jsonb  -- { days_inactive: 30, form_id: '...', etc. }
  actions         jsonb NOT NULL  -- [{ type: 'send_email', template: '...', delay_days: 0 }, ...]
  is_active       boolean DEFAULT true
  created_at      timestamptz DEFAULT now()

automation_logs
  id              uuid PK DEFAULT gen_random_uuid()
  automation_id   uuid FK → automations NOT NULL
  target_id       uuid  -- client_id or lead_id that triggered
  status          text  -- triggered | completed | failed
  executed_at     timestamptz DEFAULT now()
  error           text

-- ============================================
-- INVOICES (tracking only, no payment processing)
-- ============================================
invoices
  id              uuid PK DEFAULT gen_random_uuid()
  professional_id uuid FK → professionals NOT NULL
  client_id       uuid FK → clients NOT NULL
  service_id      uuid FK → services
  invoice_number  text NOT NULL
  amount          decimal(10,2) NOT NULL
  currency        text DEFAULT 'EUR'
  status          text DEFAULT 'unpaid'  -- unpaid | paid | partial | overdue | cancelled
  issued_at       date DEFAULT CURRENT_DATE
  due_at          date
  paid_at         date
  notes           text
  metadata        jsonb
  created_at      timestamptz DEFAULT now()

-- ============================================
-- MICRO-SITE CONFIGURATION
-- ============================================
micro_sites
  id              uuid PK DEFAULT gen_random_uuid()
  professional_id uuid FK → professionals NOT NULL UNIQUE
  slug            text UNIQUE NOT NULL  -- subdomain: slug.corepro.com
  custom_domain   text  -- custom domain (Pro plan)
  is_published    boolean DEFAULT false
  theme           text DEFAULT 'default'  -- default | modern | minimal | bold | elegant
  sections        jsonb  -- ordered sections config
  seo_title       text
  seo_description text
  social_links    jsonb  -- { facebook, instagram, linkedin, youtube }
  created_at      timestamptz DEFAULT now()
  updated_at      timestamptz DEFAULT now()

-- ============================================
-- MARKETING ASSETS
-- ============================================
marketing_assets
  id              uuid PK DEFAULT gen_random_uuid()
  professional_id uuid FK → professionals NOT NULL
  type            text NOT NULL  -- social_post | email_template | lead_magnet | brochure
  name            text NOT NULL
  content         jsonb  -- template data / content
  file_url        text  -- generated asset URL
  status          text DEFAULT 'draft'  -- draft | published | archived
  created_at      timestamptz DEFAULT now()

-- ============================================
-- SETTINGS
-- ============================================
professional_settings
  id              uuid PK DEFAULT gen_random_uuid()
  professional_id uuid FK → professionals NOT NULL UNIQUE
  notification_preferences jsonb  -- { email: true, push: true, quiet_hours: { start, end } }
  calendar_sync   jsonb  -- { google_calendar_id, ical_url }
  integrations    jsonb  -- { zoom, meet, etc. }
  gdpr_settings   jsonb  -- { data_retention_days, consent_text }
  metadata        jsonb  -- niche-specific settings
  created_at      timestamptz DEFAULT now()
  updated_at      timestamptz DEFAULT now()

-- ============================================
-- NICHE-SPECIFIC TABLES (PLACEHOLDER)
-- ============================================
-- These will be added per-niche specialization.
-- FitCore Pro: programs, workouts, exercises, meal_plans, meals, foods, progress_entries, progress_photos, etc.
-- EstateCore Pro: properties, exclusive_contracts, transactions, viewings, offers, cma_reports, etc.
-- Convention: prefix with niche abbreviation or place in separate schema.
```

### 2.2 Universal Feature Matrix

| Feature | Dashboard | Portal | Micro-Site | Notes |
|---------|-----------|--------|------------|-------|
| Auth (Clerk) | ✅ | ✅ | Public | Roles: owner, admin, client |
| KPI Cards | ✅ | — | — | Configurable per niche |
| Activity Feed | ✅ | ✅ (filtered) | — | Real-time updates |
| Client CRUD + Profile | ✅ | Self-edit | — | Tabbed profile with niche tabs |
| Tags & Segmentation | ✅ | — | — | Unlimited, colored |
| Lead Pipeline (Kanban) | ✅ | — | — | Customizable stages |
| Services CRUD | ✅ | View only | ✅ Listed | Price, duration |
| Calendar / Scheduling | ✅ | Book/view | ✅ Booking widget | iCal sync |
| Real-time Chat | ✅ | ✅ | — | Supabase Realtime |
| Form Builder | ✅ Create | ✅ Fill | ✅ Contact form | Drag & drop fields |
| Document Mgmt | ✅ | ✅ Upload | — | Categories, access control |
| Notifications | ✅ | ✅ | — | In-app + email + push |
| Automations | ✅ | — | — | Trigger → Action engine |
| Invoice Tracking | ✅ | View | — | No payment processing |
| Marketing Kit | ✅ | — | — | Templates, email, social |
| Micro-Site Builder | ✅ Editor | — | ✅ Rendered | Themes, sections, SEO |
| Analytics | ✅ | — | — | Business + client metrics |
| Settings | ✅ | Preferences | — | Billing, branding, integrations |
| GDPR Controls | ✅ Configure | ✅ Rights | ✅ Consent | Delete, export, consent |
| i18n | ✅ | ✅ | ✅ | RO + EN from day 1 |

---

## 3. Session-by-Session Implementation Plan

Each session is designed for one focused Claude Code working session (~2-4 hours of implementation). Sessions are sequential; each builds on the previous.

---

### SESSION 1 — Project Scaffolding & Dev Environment

**Goal:** Bootable Next.js 15 app with all tooling configured, zero features.

**Tasks:**
1. `npx create-next-app@latest core-pro --typescript --tailwind --app --src-dir=false --import-alias="@/*"` (Next.js 16 + React 19; Tailwind v4 CSS-first).
2. Install and configure dependencies (use `npm view <pkg> version` to pin current latest at install time):
   - **Core framework**: `next@^16`, `react@^19`, `react-dom@^19`
   - **UI**: `shadcn/ui` init with `neutral` theme (CLI auto-detects Tailwind v4). Add core shadcn components: `button`, `card`, `input`, `label`, `dialog`, `dropdown-menu`, `sheet`, `tabs`, `table`, `badge`, `avatar`, `sonner` (toast replacement), `separator`, `skeleton`, `tooltip`, `popover`, `command`, `select`, `textarea`, `checkbox`, `switch`, `calendar`, `form`
   - **Auth**: `@clerk/nextjs@^7` (Core 3 — native Supabase Third-Party Auth)
   - **DB / ORM**:
     - `drizzle-orm`, `drizzle-kit`, `postgres` (Drizzle's `postgres-js` driver — preferred over `pg` for serverless)
     - `@supabase/supabase-js`, `@supabase/ssr` (for Realtime, Storage, client reads)
   - **Payments**: `stripe@^22` (note: v22 is a hard break — `new Stripe(...)` required), `@stripe/stripe-js`
   - **Email**: `resend`, `@react-email/components@^5`
   - **i18n**: `next-intl@^4` (required for Next.js 16 `use cache` interop)
   - **Client state / queries**: `zustand@^5`, `@tanstack/react-query@^5`
   - **Validation**: `zod@^4` (use `zod/mini` in client bundles where size matters)
   - **Server Actions**: `next-safe-action` (wraps all actions with typed auth + Zod validation)
   - **Forms**: `react-hook-form`, `@hookform/resolvers`
   - **Drag & drop**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/modifiers` (replaces `@hello-pangea/dnd`)
   - **Background jobs**: `@trigger.dev/sdk@^4`, `@trigger.dev/react-hooks` (v3 deploys shut off 2026-04-01 — start on v4)
   - **PDF**: `@react-pdf/renderer` (DO NOT use Puppeteer — cold starts exceed Vercel serverless timeouts)
   - **Calendar**: `ics` (RFC 5545 invite generation)
   - **Observability**: `@sentry/nextjs`
   - **Rate limiting**: `@upstash/redis`, `@upstash/ratelimit`
   - **Env vars**: `@t3-oss/env-nextjs` (typed env validation at build time)
   - **Analytics**: `posthog-js`, `posthog-node`
   - **Utilities**: `date-fns`, `lucide-react`
3. Configure:
   - `tsconfig.json` path aliases (`@/components`, `@/lib`, `@/hooks`, `@/types`, `@/db`)
   - Tailwind v4: no more `tailwind.config.ts` by default — theme tokens live in `app/globals.css` via `@theme`. Keep CSS variables for dynamic branding (primary/secondary colors injected per-professional).
   - `drizzle.config.ts` pointing `out: './supabase/migrations'` so drizzle-generated SQL flows through Supabase's migration system.
   - `lib/env.ts` with `@t3-oss/env-nextjs` defining all required env vars (Clerk, Supabase, Stripe, Resend, Trigger, Sentry, Upstash, PostHog) — fail-fast at build.
   - `.env.local.example` mirroring `lib/env.ts` with documentation
   - `.gitignore`
   - ESLint + Prettier config
   - `instrumentation.ts` for Sentry server + edge init
4. Create folder structure matching Section 1.3 (all directories, empty `page.tsx` with `TODO` exports)
5. Create `middleware.ts` shell (Clerk + routing logic placeholder; Upstash ratelimit stub for `/api/*` and auth routes)

**Decision notes for this session:**
- **`@hello-pangea/dnd` is rejected** — feature-frozen, no grid layout support. `@dnd-kit` is the 2026 default.
- **Puppeteer is rejected** for PDF — use `@react-pdf/renderer`. If pixel-perfect HTML→PDF is ever needed, run Puppeteer inside a Trigger.dev task (no serverless timeout).
- **Prisma is rejected** — heavier, slower cold starts; Drizzle has first-class RLS (`pgPolicy`, `authenticatedRole`) + official Supabase guide.

**Deliverables:**
- App runs on `localhost:3000`
- All dependencies installed
- Full folder structure in place
- `.env.local.example` + typed `lib/env.ts` documented
- Sentry initialized (no errors yet, but SDK wired)

**Verification:**
```bash
npm run dev     # starts without errors
npm run build   # builds without errors, env validation passes
npm run lint    # passes
npx drizzle-kit --version   # drizzle-kit installed
```

---

### SESSION 1.5 — Observability & Rate Limiting Foundation

**Goal:** Sentry + Upstash Ratelimit wired in before any feature lands. Both are non-negotiable for a production CRM template and cheap to set up on day one.

**Tasks:**
1. **Sentry** (`@sentry/nextjs`):
   - Run `npx @sentry/wizard@latest -i nextjs` to scaffold configs
   - `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
   - `instrumentation.ts` exports `register()` calling Sentry init on server + edge runtimes
   - `instrumentation-client.ts` for Next 16 client instrumentation API
   - Source map upload via `next.config.ts` `withSentryConfig`
   - Tunnel route (`/monitoring`) to bypass ad blockers
   - Filter PII: scrub `email`, `phone`, client names from error context
   - Integrate with `next-safe-action` error middleware — all action errors auto-captured with context (`userId`, `orgId`, `actionName`)
2. **Upstash Ratelimit** (`@upstash/redis` + `@upstash/ratelimit`):
   - `lib/ratelimit/index.ts` defines named ratelimiters:
     - `authRateLimit` — sign-in attempts (5/min per IP)
     - `webhookRateLimit` — 100/sec per provider (Stripe, Clerk sends genuinely this fast)
     - `publicFormRateLimit` — micro-site contact forms, booking widget (3/min per IP+slug)
     - `apiRateLimit` — default for `/api/*` (60/min per user or IP)
   - Sliding-window algorithm, `ephemeralCache` enabled for edge hot-path
   - Middleware integration: `middleware.ts` applies `apiRateLimit` to `/api/*` by default, returns 429 with `Retry-After` header
   - `next-safe-action` middleware enforces `publicFormRateLimit` on public actions automatically
3. **PostHog early**: identify user on auth, start capturing core events. Respect Do-Not-Track + GDPR consent banner (Session 20 adds the banner; for now, gate `posthog-js` init behind consent cookie).
4. **Error boundaries**: global `app/error.tsx` and `app/global-error.tsx` — report to Sentry, show friendly UI, offer "reload" + "contact support" actions.
5. **Health check**: `api/health/route.ts` — verifies DB connectivity (Drizzle ping), Redis connectivity, returns JSON. Public route, ratelimited to 10/min per IP.

**Deliverables:**
- Sentry capturing client, server, edge errors with source maps
- Upstash ratelimit enforcing on auth, webhooks, public endpoints, `/api/*`
- Global error boundaries
- Health check endpoint

**Verification:**
```bash
# Manual: throw an error in a Server Action → appears in Sentry with userId/orgId tags
# Manual: hammer /api/health → 429 after 10 requests in a minute
# Manual: curl sign-in endpoint 6x rapidly → 6th returns 429
```

---

### SESSION 2 — Drizzle Schema, Supabase RLS & Migration Foundation

**Goal:** Complete database schema defined in Drizzle (source of truth), RLS policies on every table, migrations generated into `supabase/migrations/`, storage buckets provisioned.

**Schema authoring model (important):**
- **`lib/db/schema.ts` is the single source of truth** for all tables, columns, indexes, and RLS policies.
- Use Drizzle's `pgTable`, `pgPolicy`, `authenticatedRole`, `anonRole` helpers to declare RLS alongside each table.
- `drizzle-kit generate` produces SQL files and writes them into `supabase/migrations/` (configured in `drizzle.config.ts`).
- Hand-written SQL files in `supabase/migrations/` are reserved for: Postgres extensions, Supabase Storage buckets + policies, Realtime publication config, custom trigger functions (e.g. `updated_at`), seed scaffolding.

**Tasks:**
1. Initialize Supabase local dev: `npx supabase init`, `npx supabase start`
2. Create hand-written pre-schema migrations:
   - `0000_extensions.sql` — Enable `uuid-ossp`, `pgcrypto`
   - `0001_functions.sql` — `updated_at` trigger function
3. Author Drizzle schema files in `lib/db/schema/` (one file per domain, re-exported from `schema.ts`):
   - `professionals.ts` — `professionals` table + indexes
   - `clients.ts` — `clients`, `professional_clients`, `tags`, `client_tags`
   - `leads.ts` — `lead_stages`, `leads`, `lead_activities`
   - `services.ts` — `services`
   - `scheduling.ts` — `availability_slots`, `appointments`
   - `messaging.ts` — `conversations`, `messages`
   - `forms.ts` — `forms`, `form_assignments`, `form_responses`
   - `documents.ts` — `documents`
   - `notifications.ts` — `notifications`
   - `automations.ts` — `automations`, `automation_logs`
   - `invoices.ts` — `invoices`
   - `micro_sites.ts` — `micro_sites`, `marketing_assets`
   - `settings.ts` — `professional_settings`
   - `_niche.ts` — Comment-only placeholder explaining where niche tables go
4. Declare RLS policies inline with each table via `pgPolicy(...)`. Policies reference Clerk JWT claims through Supabase's TP Auth pattern:
   - Professionals: `auth.jwt() ->> 'sub' = clerk_user_id`
   - Clients: scoped via `professional_clients` join with `auth.jwt() -> 'org_id'`
   - Messages: only conversation participants (professional OR client id match)
   - Documents: scoped to professional-client relationship
   - All other tables: scoped by `professional_id` match to current user's professional
   - Use `(select auth.jwt() ...)` wrapping for optimizer caching; index `professional_id` / `clerk_user_id` columns.
5. Generate + apply migrations: `npx drizzle-kit generate && npx supabase db reset`
6. Hand-written post-schema migrations:
   - `9900_storage_buckets.sql` — Create buckets `avatars`, `documents`, `media`, `marketing`
   - `9901_storage_policies.sql` — Bucket access policies (mirror table RLS)
   - `9902_realtime.sql` — Add `messages`, `notifications`, `conversations`, `leads` to `supabase_realtime` publication
7. Write `supabase/seed.sql`: 1 professional, 3 clients, sample tags, lead stages, services (raw SQL — runs against the seeded auth schema).

**Deliverables:**
- Drizzle schema complete for all common entities
- `drizzle-kit generate` produces clean migrations
- All migrations apply cleanly via `npx supabase db reset`
- RLS enabled on every table, scoped by Clerk JWT claims
- Storage buckets + policies provisioned
- Realtime publication configured
- Seed data loadable

**Verification:**
```bash
npx drizzle-kit generate       # regenerates migration, no diff
npx supabase db reset          # applies all migrations + seed
npx supabase db lint           # no issues
# Manual: verify RLS via Supabase Studio SQL editor — query with a mock Clerk JWT
```

---

### SESSION 3 — Drizzle Client, RLS Transaction Helper & Typed Queries

**Goal:** Type-safe DB access from any context. Drizzle types inferred from schema (no separate type-generation step). RLS enforced via a transaction wrapper that sets Clerk JWT claims before every user-scoped query.

**Tasks:**
1. **Drizzle clients** in `lib/db/client.ts`:
   ```typescript
   // user-scoped: connects as `authenticator`, transactions run as `authenticated`
   export const db = drizzle(postgres(DATABASE_URL, { prepare: false }), { schema });
   // service-role: bypasses RLS. USE ONLY IN: webhooks, cron, Trigger.dev jobs.
   export const dbAdmin = drizzle(postgres(DATABASE_URL_SERVICE_ROLE, { prepare: false }), { schema });
   ```
   Mark file with `import "server-only"`.
2. **RLS transaction helper** `lib/db/rls.ts` (based on `rphlmr/drizzle-supabase-rls` pattern):
   ```typescript
   import "server-only";
   export async function withRLS<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
     const { userId, orgId, getToken } = await auth();  // Clerk
     const token = await getToken();
     return db.transaction(async (tx) => {
       await tx.execute(sql`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, org_id: orgId })}, true)`);
       await tx.execute(sql`set local role authenticated`);
       return fn(tx);
     });
   }
   ```
   Every Server Action and RSC query that reads user-scoped tables MUST go through `withRLS`.
3. **Supabase clients** in `lib/supabase/` (for Realtime, Storage, client-side reads only):
   - `client.ts` — Browser client (`createBrowserClient` from `@supabase/ssr`, reads Clerk token via `accessToken` callback — native Third-Party Auth)
   - `server.ts` — Server client (cookies-aware, same Clerk TP Auth token pattern) for use in RSC when we need Storage signed URLs
   - `admin.ts` — Service role client (webhooks, Storage admin ops)
4. **Typed query helpers** in `lib/db/queries/` (all user-scoped queries wrapped in `withRLS`):
   - `professionals.ts` — `getProfessional()`, `updateProfessional()`, `getProfessionalBySlug()`
   - `clients.ts` — `getClients()`, `getClient()`, `createClient()`, `updateClient()`
   - `leads.ts` — `getLeads()`, `getLeadsByStage()`, `createLead()`, `moveLeadToStage()`
   - `messages.ts` — `getConversations()`, `getMessages()`, `sendMessage()`
   - `notifications.ts` — `getUnreadNotifications()`, `markAsRead()`
5. **`next-safe-action` client** in `lib/actions/safe-action.ts`:
   - `publicAction` — no auth, Zod-validated input, wraps Sentry + Upstash ratelimit
   - `authedAction` — requires Clerk session, injects `ctx.userId`/`ctx.orgId`, runs inside `withRLS` by default
6. `types/domain.ts` — business types that compose inferred Drizzle `InferSelectModel` types with computed fields.
7. `lib/utils.ts` — `cn()`, `formatCurrency()`, `formatDate()`, `getInitials()`.

**Deliverables:**
- Drizzle user-scoped + service-role clients
- `withRLS` transaction helper working against Clerk JWT
- `next-safe-action` `authedAction` / `publicAction` factories
- Supabase clients configured with Clerk Third-Party Auth (no deprecated JWT template)
- Query helpers for all core entities
- Zero `any` types — all inferred from Drizzle schema

**Verification:**
```bash
npm run build   # TypeScript compilation passes
# Manual: sign in as professional A, call getClients() → returns only A's clients
# Manual: sign in as professional B, call getClients() → returns only B's clients
# Manual: bypass withRLS intentionally → query returns zero rows (RLS catches it)
```

---

### SESSION 4 — Clerk Auth Integration (Native Supabase TP Auth) & Middleware

**Goal:** Complete auth flow with Clerk + Supabase integrated via Clerk's **native Third-Party Auth** (not the deprecated JWT template). Sign-up, sign-in, org creation, role-based routing, middleware protection.

**Critical pattern — Clerk ↔ Supabase integration:**
- In Supabase dashboard: **enable Clerk as a Third-Party Auth provider** (Authentication → Providers → Third-Party → Clerk). Provide Clerk's Frontend API URL.
- In `lib/supabase/server.ts` / `client.ts`: pass Clerk's session token via the `accessToken` async callback option. **Do NOT** call `getToken({ template: "supabase" })` — that template was deprecated April 2025.
- In RLS policies: reference `auth.jwt() ->> 'sub'` (Clerk user id) and `auth.jwt() -> 'org_id'` (Clerk org id).
- **Gotcha**: Clerk custom domains have a JWKS path mismatch that can break Supabase Realtime. Stay on the default `*.clerk.accounts.dev` / `clerk.<your-prod-domain>` setup and verify the Realtime JWKS fix before going live.

**Tasks:**
1. Configure Clerk:
   - Enable Clerk as Third-Party Auth provider in Supabase dashboard
   - `ClerkProvider` in root `layout.tsx`
   - Sign-in page at `(auth)/sign-in/[[...sign-in]]/page.tsx`
   - Sign-up page at `(auth)/sign-up/[[...sign-up]]/page.tsx`
   - Auth layout with centered card design
2. Implement `middleware.ts` (Clerk v7 `clerkMiddleware`):
   - Public routes: `/(marketing)/*`, `/[slug]/*` (micro-sites), `/api/webhooks/*`
   - Protected routes: `/dashboard/*` (requires auth + professional role)
   - Protected routes: `/portal/*` (requires auth + client role)
   - Redirect logic: sign-in → dashboard (professionals) or portal (clients)
   - Attach Upstash ratelimit for `/api/*` (see rate-limit plan in Session 1)
3. Clerk webhook handler (`api/webhooks/clerk/route.ts`) — uses `dbAdmin` (service role), NOT `withRLS`:
   - `user.created` → Insert into `professionals` (if signing up as professional)
   - `user.updated` → Sync profile changes
   - `user.deleted` → Cascading delete (GDPR)
   - `organization.created` → Link org to professional
   - `organizationMembership.created` → Handle client invitation acceptance
   - Svix signature verification
4. Create `hooks/use-professional.ts` — Returns current professional context (id, plan, limits, branding) from Clerk `publicMetadata` + Drizzle query
5. Create `hooks/use-user-role.ts` — Returns `'professional' | 'client' | 'admin'` based on Clerk org role
6. Create `lib/clerk/helpers.ts`:
   - `inviteClient(email, professionalId)` — Sends Clerk org invitation with client role
   - `getCurrentProfessionalId()` — Server-side helper reading Clerk `auth()` and resolving to professional id
   - `syncUserToSupabase()` — Idempotent ensure-record helper (used in webhook retry paths)

**Deliverables:**
- Complete auth flow working
- Middleware correctly routing by role
- Webhook syncing Clerk ↔ Supabase
- Role-based hooks available

**Verification:**
```
- Sign up as professional → lands on /dashboard
- Sign up as client (via invitation) → lands on /portal
- Unauthenticated → micro-site pages accessible
- Direct URL /dashboard without auth → redirects to sign-in
```

---

### SESSION 5 — Stripe Integration & Subscription Management

**Goal:** Professional subscription lifecycle: plan selection, checkout, webhook handling, plan limits enforcement.

**Tasks:**
1. Define plans in `lib/stripe/plans.ts`:
   ```typescript
   export const PLANS = {
     starter: { price_id: '...', max_clients: 15, max_storage_mb: 500, features: [...] },
     growth: { price_id: '...', max_clients: 50, max_storage_mb: 2000, features: [...] },
     pro: { price_id: '...', max_clients: 150, max_storage_mb: 5000, features: [...] },
     enterprise: { price_id: null, max_clients: Infinity, max_storage_mb: Infinity, features: [...] },
   }
   ```
2. Create Stripe webhook handler (`api/webhooks/stripe/route.ts`):
   - `checkout.session.completed` → Update professional's plan + Stripe IDs
   - `customer.subscription.updated` → Sync plan changes
   - `customer.subscription.deleted` → Downgrade to free/locked
   - `invoice.payment_failed` → Notify professional, grace period
   - Webhook signature verification
3. Create `lib/stripe/client.ts`:
   - `createCheckoutSession(professionalId, planId)` → Returns Stripe Checkout URL
   - `createCustomerPortalSession(professionalId)` → Returns Stripe Customer Portal URL
   - `getSubscriptionStatus(professionalId)` → Current plan + status
4. Create `hooks/use-subscription.ts`:
   - Returns: `{ plan, limits, isActive, canAddClient, canUseFeature(feature), usage }`
   - Checks against current usage vs. plan limits
5. Create plan gate component `components/shared/plan-gate.tsx`:
   - Wraps features that require specific plans
   - Shows upgrade prompt if plan insufficient
6. Create pricing page at `(marketing)/pricing/page.tsx`:
   - Plan comparison table
   - CTA buttons linking to Stripe Checkout
7. Create billing settings at `dashboard/settings/billing/`:
   - Current plan display
   - Usage meters (clients, storage)
   - Upgrade/downgrade buttons → Stripe Checkout
   - Customer Portal link (manage payment method, invoices)

**Deliverables:**
- Stripe Checkout flow working
- Webhook processing all subscription events
- Plan limits enforced in code
- Billing settings page functional

**Verification:**
```
- Select plan on pricing page → Stripe Checkout → redirects back with active plan
- Webhook fires → Supabase professional.plan updated
- Exceed client limit → gate blocks adding new client
- Access Stripe Customer Portal from settings
```

---

### SESSION 6 — Dashboard Layout & Navigation Shell

**Goal:** Complete dashboard layout with sidebar, topbar, mobile responsiveness, and all navigation items linked.

**Tasks:**
1. Create `dashboard/layout.tsx`:
   - Sidebar navigation (collapsible on mobile via Sheet)
   - Top bar with: professional name/avatar, notification bell, org switcher, settings dropdown
   - Main content area with breadcrumbs
   - Mobile bottom navigation bar
2. Sidebar navigation items (with Lucide icons):
   - Dashboard (Home)
   - Clients (Users)
   - Leads (Target)
   - Services (Briefcase)
   - Calendar (Calendar)
   - Messages (MessageCircle) + unread badge
   - Forms (FileText)
   - Documents (FolderOpen)
   - Invoices (Receipt)
   - Automations (Zap)
   - Marketing (Megaphone)
   - Analytics (BarChart3)
   - Site Builder (Globe)
   - `_niche` section divider with placeholder
   - Settings (Settings) — bottom
3. Create `components/dashboard/sidebar.tsx` — Responsive sidebar with collapse state
4. Create `components/dashboard/topbar.tsx` — With notification dropdown, avatar menu
5. Create `components/dashboard/mobile-nav.tsx` — Bottom tab bar for mobile
6. Create `components/dashboard/breadcrumbs.tsx` — Auto-generated from route
7. Create `components/shared/page-header.tsx` — Reusable page header (title, description, actions)
8. Create all placeholder pages (`dashboard/*/page.tsx`) with proper `PageHeader` + "Coming soon" or empty state
9. Style with dynamic branding: CSS variables from professional's branding config applied to dashboard

**Deliverables:**
- Full dashboard shell navigable
- All menu items linked to placeholder pages
- Responsive on mobile/tablet/desktop
- Branding colors applied dynamically

**Verification:**
```
- Navigate all sidebar items → pages render with header
- Collapse sidebar on desktop → icons only
- Mobile → bottom nav + hamburger sheet
- Resize browser → responsive layout maintained
```

---

### SESSION 7 — Client Portal Layout & Navigation Shell

**Goal:** Complete client portal layout, branded with the professional's colors/logo.

**Tasks:**
1. Create `portal/layout.tsx`:
   - Branded header with professional's logo + name
   - Simple top navigation (horizontal)
   - Mobile-responsive
   - Branding loaded from professional's settings (via API route that returns branding by org)
2. Portal navigation items:
   - Dashboard (Home)
   - Messages (MessageCircle)
   - Documents (FolderOpen)
   - Forms (FileText)
   - Progress (TrendingUp) — generic progress placeholder
   - `_niche` placeholder section
3. Create `components/portal/header.tsx` — Branded header
4. Create `components/portal/nav.tsx` — Top nav bar
5. Create `components/portal/mobile-nav.tsx` — Bottom mobile nav
6. Create all placeholder pages with empty states
7. Create API route `api/branding/[professional_id]/route.ts` — Returns branding config (public)
8. Create `hooks/use-portal-context.ts` — Returns professional info + branding for the portal

**Deliverables:**
- Client portal shell navigable
- Branded with professional's colors/logo
- All nav items linked to placeholder pages
- Mobile responsive

**Verification:**
```
- Client logs in → portal renders with professional's branding
- Navigate all portal sections → pages render
- Mobile → responsive layout
```

---

### SESSION 8 — CRM Core: Client CRUD & Tabbed Profile

**Goal:** Full client management — list, create, edit, view (tabbed profile), search, filter, bulk actions.

**Tasks:**
1. `dashboard/clients/page.tsx`:
   - Client list with DataTable (sortable, searchable, filterable)
   - Filters: by tag, status, date range
   - Bulk actions: add/remove tags, send message, export CSV
   - "Add Client" button → dialog or side sheet
   - Client card: avatar, name, tags, status, last activity
2. `dashboard/clients/[id]/page.tsx` — Tabbed client profile:
   - Tab: Overview (key info, activity timeline, quick actions)
   - Tab: Details (personal info, editable form)
   - Tab: Messages (embedded conversation)
   - Tab: Documents (uploaded docs)
   - Tab: Forms (assigned + completed)
   - Tab: Invoices (related invoices)
   - Tab: Notes (internal, invisible to client)
   - Tab: `_niche` — Placeholder for niche-specific tabs
3. Create Server Actions in `lib/actions/clients.ts`:
   - `createClient(data)` — Create + invite via Clerk
   - `updateClient(id, data)` — Update profile
   - `archiveClient(id)` — Soft archive
   - `addTagToClient(clientId, tagId)`
   - `removeTagFromClient(clientId, tagId)`
   - `exportClientsCSV(professionalId, filters)`
4. Create components:
   - `components/dashboard/clients/client-table.tsx` — DataTable with columns
   - `components/dashboard/clients/client-card.tsx` — Card view alternative
   - `components/dashboard/clients/client-form.tsx` — Create/edit form (react-hook-form + zod)
   - `components/dashboard/clients/client-profile-tabs.tsx` — Tab container
   - `components/dashboard/clients/activity-timeline.tsx` — Chronological activity feed
   - `components/dashboard/clients/tag-manager.tsx` — Tag CRUD + assignment
5. Enforce plan limits: check `max_clients` before creation

**Deliverables:**
- Full CRUD for clients
- Tabbed profile page
- Tag system working
- Search, filter, bulk actions
- Plan limits enforced

**Verification:**
```
- Add client → appears in list
- Edit client details → saved
- Assign tags → visible on profile and filterable in list
- Bulk select → add tag to multiple clients
- Tabbed profile → all tabs render (with placeholders for niche tabs)
```

---

### SESSION 9 — Lead Pipeline (Kanban Board)

**Goal:** Drag-and-drop Kanban board for lead management, with customizable stages.

**Tasks:**
1. `dashboard/leads/page.tsx`:
   - Kanban board with `@dnd-kit/core` + `@dnd-kit/sortable` (NOT `@hello-pangea/dnd`)
   - Use `DndContext` with `PointerSensor` + `KeyboardSensor` (a11y out of the box)
   - Columns = lead stages (configurable) — each column is a `SortableContext` with vertical list strategy
   - Cards = leads (name, source, score, tags, created date), wrapped in `useSortable`
   - Drag & drop between stages (auto-logs stage change via `moveLeadToStage` Server Action)
   - Optimistic update + rollback on action failure
   - "Add Lead" quick form (name, email, phone, source)
   - Lead click → slide-over detail panel
2. Lead detail panel:
   - Contact info
   - Score (manual or auto)
   - Activity timeline (auto-logged: stage changes, emails, notes)
   - Add note / log call
   - Convert to client (creates client + links)
   - Mark as lost (with reason)
3. Stage management (in settings or inline):
   - CRUD stages (name, color, position, is_won, is_lost)
   - Default stages seeded: New → Contacted → Qualified → Proposal → Won → Lost
4. Create Server Actions in `lib/actions/leads.ts`:
   - `createLead(data)`
   - `moveLeadToStage(leadId, stageId)` — Logs activity
   - `convertLeadToClient(leadId)` — Creates client, links, archives lead
   - `addLeadActivity(leadId, type, description)`
5. Create components:
   - `components/dashboard/leads/kanban-board.tsx` — `DndContext` root, handles `onDragEnd`
   - `components/dashboard/leads/kanban-column.tsx` — `SortableContext` per stage
   - `components/dashboard/leads/lead-card.tsx` — `useSortable` item
   - `components/dashboard/leads/lead-detail.tsx`
   - `components/dashboard/leads/stage-manager.tsx`

**Deliverables:**
- Kanban board with drag & drop
- Lead CRUD and stage management
- Activity logging on stage changes
- Convert to client flow

**Verification:**
```
- Add lead → appears in first column
- Drag to next stage → position updates, activity logged
- Click lead → detail panel shows
- Convert → client created, lead archived
```

---

### SESSION 10 — Real-Time Messaging

**Goal:** Full chat system between professional and client using Supabase Realtime.

**Tasks:**
1. `dashboard/messages/page.tsx`:
   - Conversation list (left panel): client avatar, name, last message preview, unread badge
   - Chat area (right panel): message thread, input, send button
   - Search conversations
   - Real-time: new messages appear instantly via Supabase Realtime subscription
2. `portal/messages/page.tsx`:
   - Single conversation view (client sees only their conversation with professional)
   - Same chat component, different layout
3. Create `hooks/use-realtime.ts`:
   - Generic realtime subscription hook
   - `useMessages(conversationId)` — Subscribes to INSERT on messages table
   - `useConversations(professionalId)` — Subscribes to changes on conversations
4. Create Server Actions in `lib/actions/messages.ts`:
   - `sendMessage(conversationId, content, type)`
   - `getOrCreateConversation(professionalId, clientId)`
   - `markMessagesAsRead(conversationId, userId)`
5. Create components:
   - `components/shared/chat/conversation-list.tsx`
   - `components/shared/chat/message-thread.tsx`
   - `components/shared/chat/message-bubble.tsx`
   - `components/shared/chat/message-input.tsx` — Text + media upload
   - `components/shared/chat/typing-indicator.tsx`
6. Implement unread count badge in sidebar/topbar navigation
7. File sharing in messages: upload to Supabase Storage, store URL in message

**Deliverables:**
- Real-time messaging working
- Both dashboard and portal views
- Unread badges updating
- Media sharing

**Verification:**
```
- Send message from dashboard → appears in portal instantly (and vice versa)
- Unread badge increments on new message
- Mark as read → badge clears
- Upload image in chat → displays inline
```

---

### SESSION 11 — Calendar, Scheduling & Availability

**Goal:** Full scheduling system with availability management, booking, and appointment CRUD.

**Tasks:**
1. `dashboard/calendar/page.tsx`:
   - Calendar view (day/week/month) using a lightweight calendar component (build custom or use `@schedule-x/react` or similar)
   - Appointments displayed color-coded by type
   - Click to create / edit appointment
   - Drag to reschedule
   - Sidebar: today's agenda, upcoming
2. Availability management (in settings or calendar page):
   - Weekly recurring slots (day of week, start/end time)
   - Buffer between appointments
   - Toggle days on/off
3. Booking widget (for micro-site embed):
   - `components/shared/booking-widget.tsx`
   - Shows available slots for next 2 weeks
   - Client selects slot → creates appointment with status "pending"
   - Professional confirms → status "confirmed"
4. Create Server Actions in `lib/actions/appointments.ts`:
   - `getAppointments(professionalId, dateRange)`
   - `createAppointment(data)`
   - `updateAppointment(id, data)`
   - `cancelAppointment(id, reason)`
   - `getAvailableSlots(professionalId, date)` — Computes from availability minus booked
5. Email reminders (Resend):
   - 24h before: email to both professional and client
   - 1h before: email reminder
   - Integration hook with Trigger.dev for scheduled reminders
6. iCal export: `api/calendar/[professional_id]/ical/route.ts` — Returns `.ics` feed generated with the `ics` npm package (RFC 5545 compliant, zero deps)
7. iCal invite attachments: when an appointment is created, generate a `.ics` invite with `ics` and attach to confirmation email via Resend

**Deliverables:**
- Calendar with CRUD
- Availability configuration
- Booking widget component
- Email reminders scheduled
- iCal export

**Verification:**
```
- Set availability → slots appear in booking widget
- Create appointment → shows on calendar
- Book via widget → professional notified
- iCal feed URL → imports into Google Calendar
```

---

### SESSION 12 — Form Builder & Form Responses

**Goal:** Drag-and-drop form builder for professionals, form assignment and completion by clients.

**Tasks:**
1. `dashboard/forms/page.tsx`:
   - List of forms (templates + custom)
   - Create new form button
2. `dashboard/forms/[id]/edit/page.tsx`:
   - Form builder with drag & drop field types:
     - Short text, long text, email, phone, number
     - Single select, multi select (radio/checkbox)
     - Date picker, file upload
     - Numeric slider (scale 1-10)
     - Signature field (canvas draw)
     - Section header / separator
   - Form schema stored as JSON in `forms.schema`
   - Preview mode
   - Assign to client(s) button
3. `portal/forms/page.tsx`:
   - List of assigned forms (pending + completed)
   - Click → fill form → submit
4. `portal/forms/[id]/page.tsx`:
   - Dynamic form renderer based on JSON schema
   - Validation (required fields, email format, etc.)
   - Submit → stored in `form_responses`
5. Pre-built form templates:
   - GDPR Consent
   - General Intake (personal info, goals, notes)
   - Satisfaction Survey (NPS)
   - Weekly Check-in (generic)
6. Create components:
   - `components/dashboard/forms/form-builder.tsx` — DnD builder
   - `components/dashboard/forms/field-palette.tsx` — Available field types
   - `components/dashboard/forms/field-editor.tsx` — Configure individual field
   - `components/shared/forms/form-renderer.tsx` — Renders form from schema (used in portal + micro-site)
   - `components/shared/forms/field-renderers/` — Individual field components
7. Server Actions in `lib/actions/forms.ts`:
   - `createForm(data)`, `updateForm(id, data)`
   - `assignForm(formId, clientIds)`
   - `submitFormResponse(formId, clientId, data)`
   - `getFormResponses(formId)` — For professional to view

**Deliverables:**
- Form builder with drag & drop
- JSON schema storage
- Form renderer for client portal
- Assignment + submission flow
- Pre-built templates

**Verification:**
```
- Create form with various fields → saves schema
- Assign to client → appears in portal
- Client fills and submits → response stored
- Professional views responses
```

---

### SESSION 13 — Document Management & File Storage

**Goal:** Document upload, categorization, access control for both professional and client.

**Tasks:**
1. `dashboard/documents/page.tsx`:
   - Document list with filters (by client, category, type)
   - Upload document (linked to specific client or general)
   - Categories: configurable (seeded: General, Contract, Identity, Medical, Financial, Other)
   - Preview (for images and PDFs)
   - Download
2. `portal/documents/page.tsx`:
   - Client's documents (uploaded by them or shared by professional)
   - Upload button
   - Download shared documents
3. Document integration in client profile (tab)
4. Create Server Actions in `lib/actions/documents.ts`:
   - `uploadDocument(file, metadata)` — Upload to Supabase Storage + create record
   - `getDocuments(filters)` — With RLS
   - `deleteDocument(id)` — Removes from storage + DB
   - `shareDocumentWithClient(docId, clientId)`
5. Create components:
   - `components/shared/documents/document-list.tsx`
   - `components/shared/documents/document-upload.tsx` — Drag & drop zone
   - `components/shared/documents/document-preview.tsx` — Inline preview
6. Supabase Storage policies: pre-signed URLs with 60min expiry for sensitive docs
7. Enforce storage limits per plan

**Deliverables:**
- Document upload/download working
- Categorization and filtering
- Access control (RLS)
- Pre-signed URLs for security
- Plan storage limits enforced

**Verification:**
```
- Upload document from dashboard → stored, listed
- Upload from portal → visible to professional
- Download with pre-signed URL → works for 60min
- Exceed storage limit → blocked with upgrade prompt
```

---

### SESSION 14 — Notification System

**Goal:** Multi-channel notification system: in-app, email, push (browser).

**Tasks:**
1. In-app notifications:
   - `components/shared/notification-bell.tsx` — Bell icon with unread count badge
   - `components/shared/notification-dropdown.tsx` — Dropdown list of recent notifications
   - `dashboard/notifications/page.tsx` — Full notification history
   - Real-time updates via Supabase Realtime on `notifications` table
2. Create `lib/notifications/send.ts` — Universal notification sender:
   ```typescript
   async function sendNotification({
     userId, type, title, body, link, channels // ['in_app', 'email', 'push']
   })
   ```
   - Creates in-app notification record
   - Sends email via Resend (if enabled in user preferences)
   - Sends browser push (if subscribed)
3. Email notification templates (React Email):
   - `emails/notification.tsx` — Generic notification email
   - `emails/appointment-reminder.tsx`
   - `emails/new-message.tsx`
   - `emails/form-assigned.tsx`
4. Browser push notifications:
   - Service worker registration
   - Push subscription storage
   - `lib/notifications/push.ts` — Web Push API integration
5. Notification preferences (in settings):
   - Per-type toggle (messages, appointments, forms, leads, system)
   - Per-channel toggle (in-app, email, push)
   - Quiet hours (start/end time)
6. Create `hooks/use-notifications.ts`:
   - `useUnreadCount()` — Real-time unread count
   - `useNotifications()` — Paginated notification list
   - `markAsRead(id)`, `markAllAsRead()`

**Deliverables:**
- In-app notifications with real-time updates
- Email notifications via Resend
- Browser push notifications
- Notification preferences
- Quiet hours

**Verification:**
```
- New message → in-app notification appears instantly
- Notification bell shows unread count
- Email arrives for enabled notification types
- Quiet hours → no notifications sent during window
```

---

### SESSION 15 — Invoice Tracking (No Payment Processing)

**Goal:** Invoice generation, tracking, and PDF export for record-keeping.

**Tasks:**
1. `dashboard/invoices/page.tsx`:
   - Invoice list with filters (status, client, date range)
   - "Create Invoice" button
   - Status badges: unpaid, paid, partial, overdue, cancelled
2. Invoice CRUD:
   - Create: select client, service, amount, due date, notes
   - Auto-generate invoice number (PREFIX-YYYY-NNN)
   - Edit (before sent)
   - Mark as paid / partial
   - Send reminder email for overdue
3. Invoice PDF generation with **`@react-pdf/renderer`** (do NOT use Puppeteer — cold starts exceed Vercel serverless timeouts; if pixel-perfect HTML→PDF is ever needed, run Puppeteer inside a Trigger.dev v4 task):
   - Professional's branding (logo, colors, contact info)
   - Client details
   - Line items with subtotal/total
   - Payment instructions (text field, not processing)
   - Render `<Document>` + `<Page>` components; stream PDF buffer from Route Handler or Server Action
   - Download + email to client (attach PDF via Resend attachments)
4. Revenue dashboard (in analytics page):
   - Monthly/quarterly/annual totals
   - Outstanding amount
   - Overdue amount
   - Chart: revenue over time
5. Create Server Actions in `lib/actions/invoices.ts`:
   - `createInvoice(data)`, `updateInvoice(id, data)`, `deleteInvoice(id)`
   - `generateInvoicePDF(id)` — Returns PDF buffer
   - `sendInvoiceReminder(id)` — Email via Resend
6. Client portal: `portal/invoices/page.tsx` — View invoices and their status

**Deliverables:**
- Invoice CRUD
- PDF generation with branding
- Status tracking
- Overdue reminders
- Client portal view

**Verification:**
```
- Create invoice → appears in list
- Generate PDF → downloads with branding
- Mark as paid → status updates
- Client sees invoices in portal
```

---

### SESSION 16 — Micro-Site Builder & Public Pages

**Goal:** Configurable micro-site per professional with themes, sections, and SEO.

**Tasks:**
1. `dashboard/site-builder/page.tsx`:
   - Live preview + section editor (side by side)
   - Toggle sections on/off, reorder via drag & drop
   - Sections available:
     - Hero (photo, tagline, CTA)
     - About (bio, certifications, experience)
     - Services (list from services table)
     - Testimonials (manage testimonials)
     - Contact Form (generates lead)
     - FAQ (manage Q&A pairs)
     - Blog placeholder
     - `_niche` sections placeholder
   - Theme selector (5 themes)
   - Color picker (primary, secondary, accent)
   - Logo + cover photo upload
   - Custom slug management
   - Publish / unpublish toggle
2. `[slug]/page.tsx` — Public micro-site rendering:
   - SSG/ISR for performance
   - Renders sections based on `micro_sites.sections` config
   - Dynamic theming from branding config
   - Contact form → creates lead in pipeline
   - SEO: meta tags, Open Graph, structured data (JSON-LD)
3. `[slug]/layout.tsx` — Micro-site layout (separate from dashboard)
4. Create components:
   - `components/micro-site/hero-section.tsx`
   - `components/micro-site/about-section.tsx`
   - `components/micro-site/services-section.tsx`
   - `components/micro-site/testimonials-section.tsx`
   - `components/micro-site/contact-form.tsx`
   - `components/micro-site/faq-section.tsx`
   - `components/micro-site/footer.tsx`
5. Middleware: route `[slug]` to micro-site renderer, resolve slug → professional
6. Sitemap generation: `app/sitemap.ts`
7. Robots.txt: `app/robots.ts`
8. Social sharing preview (OG image generation)

**Deliverables:**
- Site builder with live preview
- Public micro-site rendering (SSG/ISR)
- 5 themes
- SEO optimized
- Contact form → lead pipeline

**Verification:**
```
- Configure sections in builder → preview updates
- Publish → micro-site accessible at slug.domain.com
- Submit contact form → lead appears in pipeline
- Lighthouse SEO score > 90
```

---

### SESSION 17 — Marketing Kit (Email Templates & Social Assets)

**Goal:** Email campaign builder and social media template generator.

**Tasks:**
1. `dashboard/marketing/page.tsx`:
   - Tabs: Email Campaigns, Social Templates, Lead Magnets
2. Email campaigns:
   - Template library (Welcome, Newsletter, Re-engagement, Promotion, Custom)
   - Simple editor: subject, body (rich text), merge tags ({client_name}, {professional_name})
   - Recipient selection: all clients, by tags, by status
   - Send now or schedule
   - Basic analytics: sent, opened (via Resend tracking)
3. Social media templates:
   - Pre-built layouts (motivational, informational, promotional, testimonial)
   - Placeholder system: professional inserts text, colors from branding
   - Export as image (HTML → Canvas → PNG via `html2canvas` or server-side)
   - Caption generator with hashtag suggestions
4. Lead magnets:
   - Simple lead magnet builder (title, description, file upload)
   - Gated by contact form on micro-site
   - Auto-add to lead pipeline on download
5. Create Server Actions in `lib/actions/marketing.ts`:
   - `createEmailCampaign(data)`, `sendCampaign(id)`
   - `createSocialTemplate(data)`, `exportAsImage(id)`
   - `createLeadMagnet(data)`
6. Resend integration for bulk email (with rate limiting and plan limits)

**Deliverables:**
- Email campaign builder + sending
- Social media template editor + export
- Lead magnet system
- Merge tag support
- Basic email analytics

**Verification:**
```
- Create email campaign → send to segment → emails arrive
- Edit social template → export as PNG
- Lead magnet on micro-site → download gated by form → lead created
```

---

### SESSION 18 — Automation / Workflow Engine

**Goal:** Trigger-based automation system for routine tasks.

**Tasks:**
1. `dashboard/automations/page.tsx`:
   - List of automations (active/inactive toggle)
   - "Create Automation" button
2. Automation builder:
   - Step 1: Select trigger:
     - `new_client` — Client added
     - `new_lead` — Lead created (from any source)
     - `form_submitted` — Specific form completed
     - `appointment_completed` — Session done
     - `client_inactive` — No activity for X days
     - `custom_date` — Recurring (weekly check-in reminder)
   - Step 2: Configure conditions (optional):
     - Tag filter, plan tier, client status
   - Step 3: Define action chain:
     - Send email (select template)
     - Send in-app notification
     - Assign form
     - Add/remove tag
     - Move lead to stage
     - Create internal task/reminder
     - Wait X days (delay)
   - Visual pipeline: trigger → condition → action → delay → action
3. Create `lib/automations/engine.ts`:
   - `evaluateTrigger(type, payload)` — Checks if any active automations match
   - `executeAction(action, context)` — Runs the action
   - `processAutomationChain(automationId, targetId)` — Walks the action chain with delays
4. Trigger.dev v4 integration (v3 deploys shut off 2026-04-01 — use v4 from day one):
   - Background jobs for: delayed actions, recurring triggers, batch processing
   - `trigger/jobs/automation-runner.ts` — uses `task()` API with `wait.for({ days: N })` for delays
   - `trigger/jobs/inactive-client-checker.ts` (daily `schedules.task()`)
   - Jobs use `dbAdmin` (service-role Drizzle client) — webhooks/cron do NOT go through `withRLS`
5. Automation logs:
   - Track each execution: triggered, actions completed, errors
   - View logs per automation
6. Pre-built automation templates:
   - Welcome sequence (new client → email → 3 days → form)
   - Lead nurture (new lead → email → 3 days → follow-up → 7 days → offer)
   - Re-engagement (inactive 30 days → email → 14 days → notification)
   - Check-in reminder (weekly → send form)

**Deliverables:**
- Automation builder UI
- Trigger-action engine
- Trigger.dev background jobs
- Delay support
- Pre-built templates
- Execution logs

**Verification:**
```
- Create automation: new_lead → send email → wait 3 days → assign form
- Add lead → email sends immediately
- After 3 days (simulated) → form assigned
- Logs show execution chain
```

---

### SESSION 19 — Analytics Dashboard & Reports

**Goal:** Business metrics dashboard for professionals with export capability.

**Tasks:**
1. `dashboard/analytics/page.tsx`:
   - Date range selector (this week, this month, this quarter, this year, custom)
   - KPI cards (same as main dashboard, detailed):
     - Total clients (active, new this period, churned)
     - Total leads (new, converted, lost, conversion rate)
     - Revenue (invoiced, collected, outstanding)
     - Appointments (completed, cancelled, no-show rate)
     - Messages (sent, received, avg response time)
   - Charts (using Recharts):
     - Clients over time (area chart)
     - Lead conversion funnel (funnel chart)
     - Revenue over time (bar chart)
     - Appointments by type (pie chart)
     - Client acquisition by source (pie chart)
   - `_niche` placeholder for niche-specific metrics
2. Main dashboard page (`dashboard/page.tsx`):
   - KPI cards (summary versions)
   - Activity feed (last 20 activities, real-time)
   - Today's agenda (appointments)
   - Unread messages
   - Quick actions
3. Create `lib/analytics/queries.ts`:
   - `getClientMetrics(professionalId, dateRange)`
   - `getLeadMetrics(professionalId, dateRange)`
   - `getRevenueMetrics(professionalId, dateRange)`
   - `getAppointmentMetrics(professionalId, dateRange)`
   - `getActivityFeed(professionalId, limit)`
4. Export reports:
   - PDF export of analytics page
   - CSV export of raw data tables
5. Create components:
   - `components/dashboard/analytics/kpi-card.tsx`
   - `components/dashboard/analytics/chart-*.tsx` — Various chart wrappers
   - `components/dashboard/activity-feed.tsx`

**Deliverables:**
- Main dashboard with KPIs + activity feed
- Analytics page with charts
- Date range filtering
- PDF + CSV export
- Niche placeholder for custom metrics

**Verification:**
```
- Dashboard loads with accurate KPIs from seed data
- Analytics page renders charts
- Change date range → data updates
- Export CSV → valid file with correct data
```

---

### SESSION 20 — Settings, Branding & GDPR

**Goal:** Complete settings module: profile, branding, preferences, GDPR tools.

**Tasks:**
1. `dashboard/settings/page.tsx` with sub-tabs:
   - **Profile**: Edit professional info (name, bio, certifications, photo, contact)
   - **Branding**: Colors, logo, fonts (applied to portal + micro-site + emails)
   - **Billing**: (already built in Session 5, link here)
   - **Notifications**: Preference matrix (type × channel toggles)
   - **Calendar**: Integration settings (Google Calendar sync URL, timezone)
   - **Integrations**: Connected services (Zoom, Meet, future niche integrations)
   - **Team**: Invite co-professionals (admin role), manage members (Pro plan)
   - **GDPR**: Data retention settings, export data, delete account
   - **Danger Zone**: Delete account with confirmation
2. GDPR tools:
   - Client data export: `api/gdpr/export/[client_id]/route.ts` → JSON/CSV of all client data
   - Client data deletion: `api/gdpr/delete/[client_id]/route.ts` → Cascading delete
   - Consent management: track which consents client has given
   - Cookie banner component for micro-site
   - Privacy policy template
3. Professional profile editing with image upload (Supabase Storage)
4. Branding preview: live preview of how colors/logo look on portal and micro-site
5. Team management (Pro plan):
   - Invite member via Clerk Organizations
   - Assign roles (admin, member)
   - Permission matrix

**Deliverables:**
- All settings sections functional
- GDPR export and delete working
- Branding live preview
- Team management (basic)

**Verification:**
```
- Update profile → changes reflected everywhere
- Change branding colors → portal and micro-site update
- GDPR export → downloads JSON with all client data
- GDPR delete → client data fully removed
- Cookie banner shows on micro-site
```

---

### SESSION 21 — Email Templates (React Email) & Resend Integration

**Goal:** Beautiful transactional emails for all system events.

**Tasks:**
1. Create React Email templates in `emails/`:
   - `welcome.tsx` — Professional welcome after signup
   - `client-invitation.tsx` — Client invited to portal
   - `appointment-reminder.tsx` — 24h and 1h before
   - `appointment-confirmation.tsx` — Booking confirmed
   - `new-message.tsx` — You have a new message
   - `form-assigned.tsx` — New form to complete
   - `lead-notification.tsx` — New lead from micro-site
   - `invoice-sent.tsx` — Invoice attached/linked
   - `invoice-reminder.tsx` — Overdue invoice
   - `weekly-summary.tsx` — Professional weekly digest
   - `gdpr-export.tsx` — Data export ready
2. All templates:
   - Professional's branding (logo, colors)
   - Responsive design
   - Unsubscribe link
   - Preview text
3. Create `lib/resend/client.ts`:
   - `sendEmail(to, template, data)` — Renders React Email + sends via Resend
   - Rate limiting per plan
4. Create `lib/resend/templates.ts`:
   - Template registry mapping template IDs to components
5. Email preview route: `api/emails/preview/[template]/route.ts` — Render email as HTML for preview in settings

**Deliverables:**
- All email templates created
- Branded with professional's colors
- Resend integration working
- Preview capability

**Verification:**
```
- Trigger each email type → arrives with correct branding
- Preview emails in browser via API route
- Responsive on mobile email clients
```

---

### SESSION 22 — i18n (Internationalization)

**Goal:** Full multi-language support (Romanian + English), switchable per user.

**Tasks:**
1. Set up `next-intl`:
   - Configure in `next.config.ts`
   - Create `messages/ro.json` and `messages/en.json`
   - Middleware for locale detection
2. Extract ALL hardcoded strings from all pages and components into translation files:
   - Dashboard UI strings
   - Portal UI strings
   - Micro-site strings
   - Email templates (localized versions)
   - Form labels and validation messages
   - Error messages
   - Notification text
3. Structure translation files:
   ```json
   {
     "common": { "save": "...", "cancel": "...", "delete": "..." },
     "dashboard": { "title": "...", "clients": {...}, "leads": {...} },
     "portal": { "title": "...", "messages": {...} },
     "micro_site": { ... },
     "emails": { ... }
   }
   ```
4. Locale switcher component in settings + portal header
5. Professional's locale → default for their portal and micro-site
6. Client can override locale in their preferences
7. Date/time formatting respects locale
8. Currency formatting respects professional's currency setting

**Deliverables:**
- Full RO + EN support
- All UI strings extracted
- Locale switcher
- Date/time/currency localized

**Verification:**
```
- Switch to EN → all UI updates
- Switch back to RO → all UI updates
- Dates format correctly per locale
- Email templates render in correct locale
```

---

### SESSION 23 — PostHog Analytics & Feature Flags

**Goal:** Product analytics tracking and feature flag system for controlled rollouts.

**Tasks:**
1. PostHog setup:
   - `lib/posthog/client.ts` — Browser client
   - `lib/posthog/server.ts` — Server-side client
   - Provider in root layout
   - Identify user on auth (professional vs client, plan, etc.)
2. Track key events:
   - `professional_signed_up`, `client_added`, `lead_created`, `lead_converted`
   - `message_sent`, `appointment_created`, `form_submitted`
   - `invoice_created`, `micro_site_published`
   - `automation_created`, `email_campaign_sent`
   - Page views (automatic)
3. Feature flags:
   - `lib/posthog/flags.ts` — `isFeatureEnabled(flag, userId)`
   - Flags for: `ai_features`, `advanced_automations`, `white_label`, `new_ui_*`
   - Integration with plan-based gating (flag + plan check)
4. Session replay configuration (opt-in, respects GDPR)
5. Create `components/shared/feature-flag.tsx` — Wrapper component

**Deliverables:**
- PostHog tracking all key events
- Feature flags working
- Session replay configured
- GDPR-compliant (consent required)

**Verification:**
```
- Perform actions → events appear in PostHog dashboard
- Toggle feature flag → feature appears/disappears in UI
- User identified with correct properties
```

---

### SESSION 24 — PWA, Service Worker & Mobile Optimizations

**Goal:** Progressive Web App capabilities for mobile users.

**Tasks:**
1. PWA setup:
   - `public/manifest.json` — App manifest (name, icons, theme, display: standalone)
   - Service worker registration
   - Offline fallback page
   - Install prompt component
2. Service worker capabilities:
   - Cache static assets (CSS, JS, images)
   - Cache API responses (for offline view of appointments, messages)
   - Background sync (queue messages when offline)
3. Mobile optimizations:
   - Touch-optimized UI (larger tap targets)
   - Pull-to-refresh on list pages
   - Swipe actions on list items (archive, mark read)
   - Bottom sheet dialogs (vs modals on desktop)
   - Viewport handling (safe areas, keyboard)
4. App-like behaviors:
   - Splash screen
   - Status bar color matching branding
   - Share target (share content to app)
5. Performance audit:
   - Lighthouse PWA checklist
   - Bundle size analysis
   - Image optimization (next/image, WebP, lazy loading)
   - Code splitting per route

**Deliverables:**
- PWA installable on mobile
- Offline fallback working
- Mobile-optimized UI
- Lighthouse PWA score > 90

**Verification:**
```
- Install PWA on phone → launches as standalone app
- Go offline → cached pages still work
- Send message offline → syncs when back online
- Lighthouse audit → PWA badge + performance > 80
```

---

### SESSION 25 — End-to-End Testing & Final Polish

**Goal:** Critical user flows tested, error handling complete, production readiness.

**Tasks:**
1. Set up Playwright for E2E tests:
   - `tests/e2e/auth.spec.ts` — Sign up, sign in, role routing
   - `tests/e2e/clients.spec.ts` — CRUD, tags, profile
   - `tests/e2e/leads.spec.ts` — Pipeline, drag & drop, convert
   - `tests/e2e/messages.spec.ts` — Send, receive, real-time
   - `tests/e2e/appointments.spec.ts` — Create, booking widget
   - `tests/e2e/forms.spec.ts` — Build, assign, fill, submit
   - `tests/e2e/invoices.spec.ts` — Create, PDF, status
   - `tests/e2e/micro-site.spec.ts` — Publish, render, contact form → lead
   - `tests/e2e/stripe.spec.ts` — Checkout, webhook, plan limits
2. Error handling audit:
   - All Server Actions have try/catch with user-friendly errors
   - Loading states on all async operations (Skeleton components)
   - Empty states for all list pages
   - 404 page, 500 page, error boundary
   - Toast notifications for success/error feedback
3. Accessibility audit:
   - Keyboard navigation on all interactive elements
   - Screen reader labels
   - Color contrast check
   - Focus management
4. Performance final pass:
   - Server Components where possible (minimize client JS)
   - Suspense boundaries for streaming
   - Database query optimization (indexes review)
   - `next build` analysis — no warnings
5. Security checklist:
   - All API routes validate auth
   - RLS tested with different roles
   - CSRF protection
   - Rate limiting on public endpoints (contact form, booking)
   - Input sanitization
6. Documentation:
   - `README.md` — Setup instructions, env vars, architecture
   - `CONTRIBUTING.md` — Code conventions
   - `docs/niche-extension.md` — Guide for adding niche-specific modules

**Deliverables:**
- E2E tests passing
- Error states handled
- Accessibility WCAG 2.1 AA
- Performance optimized
- Security audited
- Documentation complete

**Verification:**
```bash
npx playwright test              # all E2E tests pass
npm run build                    # zero warnings
npx next lint                    # zero issues
lighthouse --preset=desktop      # all scores > 80
```

---

## 4. Placeholder Conventions

Every niche-specific extension point follows this convention:

### 4.1 Dashboard Niche Placeholder

```
dashboard/_niche/README.md
```
Content:
```markdown
# Niche-Specific Dashboard Modules

Add domain-specific pages here. Examples:
- FitCore Pro: programs/, nutrition/, progress-photos/
- EstateCore Pro: properties/, contracts/, transactions/, viewings/, cma/

Each module should:
1. Create its own page.tsx in this directory or a subdirectory
2. Add navigation item in components/dashboard/sidebar.tsx under the NICHE section
3. Add corresponding Supabase migrations in supabase/migrations/1xx_niche_*.sql
4. Add types in types/niche/
5. Add server actions in lib/actions/niche/
```

### 4.2 Portal Niche Placeholder

```
portal/_niche/README.md
```
Content:
```markdown
# Niche-Specific Portal Pages

Add client-facing niche pages here. Examples:
- FitCore Pro: workouts/, nutrition/, progress/
- EstateCore Pro: seller/, buyer/, transaction/

Each page should:
1. Use the portal layout (branded)
2. Respect RLS (client sees only their data)
3. Add navigation item in components/portal/nav.tsx
```

### 4.3 Micro-Site Niche Placeholder

```
[slug]/_niche/README.md
```
Content:
```markdown
# Niche-Specific Public Pages

Add public-facing niche pages here. Examples:
- FitCore Pro: transformation gallery
- EstateCore Pro: property/[id]/ individual listing pages, portfolio grid

Each page should:
1. Use ISR/SSG for performance
2. Include SEO metadata
3. Match the micro-site theme
```

### 4.4 Database Niche Placeholder

```sql
-- supabase/migrations/015_niche_placeholder.sql
-- ============================================
-- NICHE-SPECIFIC TABLES
-- ============================================
-- Add domain-specific tables here.
-- Convention: use migrations numbered 1xx (100+)
--
-- FitCore Pro example:
--   100_programs.sql, 101_workouts.sql, 102_exercises.sql,
--   103_nutrition.sql, 104_progress.sql
--
-- EstateCore Pro example:
--   100_properties.sql, 101_contracts.sql, 102_transactions.sql,
--   103_viewings.sql, 104_cma.sql
--
-- All niche tables MUST:
--   1. Include professional_id FK with RLS policy
--   2. Include created_at/updated_at timestamps
--   3. Use uuid PKs with gen_random_uuid()
```

---

## 5. Post-Boilerplate: Niche Specialization Strategy

After completing all 25 sessions, you have a **100% functional CRM boilerplate** with:

- Auth, subscriptions, billing ✅
- Client management with CRM, tags, pipeline ✅
- Messaging, scheduling, forms, documents ✅
- Micro-site, marketing kit, automations ✅
- Analytics, notifications, settings, GDPR ✅
- i18n, PWA, testing, performance ✅

### To specialize for FitCore Pro, add:

| Module | Tables | Dashboard Pages | Portal Pages |
|--------|--------|----------------|--------------|
| Programs | programs, program_phases, workouts, workout_exercises | dashboard/programs/ | portal/workouts/ |
| Exercise Library | exercises (system + custom) | dashboard/exercises/ | (inline in workouts) |
| Nutrition | meal_plans, meals, meal_items, foods | dashboard/nutrition/ | portal/nutrition/ |
| Progress Tracking | progress_entries, progress_photos | (in client profile) | portal/progress/ |
| Wellness Log | wellness_entries | (in client profile) | portal/wellness/ |
| Gamification | achievements, streaks, challenges | (badges on profile) | portal/achievements/ |

### To specialize for EstateCore Pro, add:

| Module | Tables | Dashboard Pages | Portal Pages |
|--------|--------|----------------|--------------|
| Properties | properties, property_photos, property_features, property_rooms, property_documents | dashboard/properties/ | (micro-site) |
| Exclusive Contracts | exclusive_contracts, contract_activities | dashboard/contracts/ | portal/seller/ |
| Transactions | transactions, transaction_stages, transaction_documents | dashboard/transactions/ | portal/transaction/ |
| Viewings | viewings, viewing_feedback, open_houses | dashboard/viewings/ | portal/viewings/ |
| CMA | cma_reports, cma_comparables | dashboard/cma/ | portal/cma-view/ |
| Offers | offers | (in transactions) | portal/offers/ |
| Portal Sindication | portal_feeds | dashboard/syndication/ | — |
| Commissions | commission_records | dashboard/commissions/ | — |

### Specialization Session Pattern (per niche):

1. **Niche Session 1** — Database migrations + RLS for niche tables
2. **Niche Session 2** — Core niche module (Programs for Fitness / Properties for RE)
3. **Niche Session 3** — Secondary niche module (Nutrition / Contracts)
4. **Niche Session 4** — Client portal niche pages
5. **Niche Session 5** — Micro-site niche sections
6. **Niche Session 6** — Niche automations + analytics
7. **Niche Session 7** — Testing + polish for niche features

---

## Appendix: Environment Variables

```bash
# .env.local.example

# ── App ──
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=CorePro

# ── Clerk ──
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# ── Supabase ──
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ── Stripe ──
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_GROWTH_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...

# ── Resend ──
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@corepro.com

# ── PostHog ──
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# ── Trigger.dev ──
TRIGGER_API_KEY=tr_dev_...
TRIGGER_API_URL=https://api.trigger.dev

# ── Optional ──
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
```

---

*Generated from analysis of FitCore Pro PRD v1.0 and EstateCore Pro PRD v1.0*
*Boilerplate target: 100% functional infrastructure with niche placeholders*
*25 Claude Code sessions → production-ready CRM foundation*
