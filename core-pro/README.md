# CorePro

The universal CRM boilerplate for service professionals — coaches, consultants,
agents, and solo-practice pros. Ships with a branded dashboard, a client portal,
real-time messaging, scheduling, invoicing, a public micro-site, and a
marketing/automation layer, all scoped per professional via Supabase RLS.

This is the **boilerplate**. Niche forks (FitCorePro, EstateCorePro, …) extend
it through reserved `_niche/` extension points — see
[`docs/niche-extension.md`](./docs/niche-extension.md).

## Stack

- **Next.js 15.5** (LTS) with the App Router, typed routes, and a
  `middleware.ts` file at the repo root.
- **React 19.0** with Server Components by default.
- **Clerk** for auth + Organizations; Supabase Third-Party Auth integration
  (no JWT templates).
- **Supabase** for Postgres, Storage, and Realtime. RLS is scoped by Clerk
  `sub` via two `SECURITY DEFINER` helpers
  (`app_current_professional_id()` / `app_current_client_id()`).
- **Drizzle ORM** for schema + queries; migrations live in
  `supabase/migrations/`.
- **Stripe** for subscriptions (starter / growth / pro / enterprise).
- **Resend** for transactional email; **Trigger.dev v4** for background jobs.
- **PostHog** for analytics + feature flags.
- **Upstash Redis** for rate limiting and ephemeral caches.
- **base-ui + shadcn-style** components under `components/ui/` with Tailwind 4.

## Getting started

### 1. Prerequisites

- Node 20+
- npm 10+
- A Supabase project (or local Supabase CLI)
- Clerk, Stripe, Resend, Upstash, PostHog accounts for production; most are
  optional for local development.

### 2. Install + configure

```bash
npm install
cp .env.local.example .env.local
# Fill in at least: Clerk, Supabase, Stripe, Resend, and a DATABASE_URL.
```

Env vars are validated at build start by `lib/env.ts`
(`@t3-oss/env-nextjs`). A missing or malformed required value fails the build
— intentional, so mis-deploys never reach production.

### 3. Database

```bash
# Apply SQL migrations (including RLS helpers + realtime + storage).
npx supabase db push
# Or: pipe supabase/migrations/*.sql into psql against DATABASE_URL.

# Regenerate Drizzle migrations from schema changes:
npm run db:generate
```

### 4. Run the dev server

```bash
npm run dev
# open http://localhost:3000
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (`eslint-config-next`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier dry-run |
| `npm run db:generate` | Drizzle: generate a migration from schema diffs |
| `npm run db:migrate` | Drizzle: apply pending migrations |
| `npm run db:push` | Drizzle: push schema directly (dev-only) |
| `npm run db:studio` | Drizzle Studio |
| `npm run test` | Playwright E2E |
| `npm run test:ui` | Playwright UI mode |
| `npm run test:headed` | Playwright with visible browser |

## Architecture

```
app/
├── (auth)/         Clerk sign-in / sign-up routes
├── (marketing)/    Public marketing shell (home, pricing, blog, legal)
├── dashboard/      Authenticated professional workspace
│   ├── _niche/     ← extension point (see docs/niche-extension.md)
│   └── settings/   Profile, branding, calendar, billing, integrations, etc.
├── portal/         Authenticated client portal (branded per pro)
│   └── _niche/     ← extension point
├── [slug]/         Public per-professional micro-site (SSG + ISR)
│   └── _niche/     ← extension point
├── api/            Route handlers: webhooks, PDFs, iCal, GDPR, health, …
├── error.tsx       App-level error boundary
├── global-error.tsx Root-document-level boundary
├── not-found.tsx   App-level 404
└── offline/        PWA offline fallback

components/
├── dashboard/      Pro-facing UI
├── portal/         Client-facing UI
├── micro-site/     Public site sections + themes
├── shared/         Cross-cutting (chat, forms, docs, page-header, pwa, …)
└── ui/             Primitives (base-ui + shadcn-style)

lib/
├── actions/        next-safe-action server actions
├── analytics/      Aggregate queries + presets (pure helpers in ./range.ts)
├── automations/    Trigger engine + templates
├── clerk/          Helpers, org sync, supabase sync
├── db/             Drizzle client, RLS wrapper (withRLS), schema, queries
├── i18n/           next-intl request config + locale cookie
├── marketing/      Email templates + merge-tag helpers
├── posthog/        Server + client analytics adapters
├── ratelimit/      Upstash limiters (auth, api, webhook, form, health)
├── resend/         Email render + send helpers, fixtures
├── scheduling/     iCal + reminder orchestration
├── stripe/         Client, plans, usage counter, webhook handlers
├── supabase/       Browser + SSR + admin clients, realtime hooks
└── triggers/       Trigger.dev job registrations

supabase/migrations/  SQL migrations (app tables, RLS, storage, realtime)
```

### Security model

- **Auth**: Clerk Organizations. A "professional" is a Clerk user; their
  clients become Clerk users on accepting an invitation (webhook-driven,
  see `app/api/webhooks/clerk/route.ts`).
- **RLS**: every read is scoped to the current session through
  `lib/db/rls.ts#withRLS`, which sets session GUCs before each transaction.
  The two helper functions `app_current_professional_id()` and
  `app_current_client_id()` (SECURITY DEFINER) break the potential policy
  recursion between `clients` and `professional_clients`.
- **Rate limiting**: enforced by `middleware.ts` plus per-action
  guards in `lib/actions/safe-action.ts`. Public endpoints additionally
  gate on `publicFormRateLimit`.
- **Webhooks**: Stripe and Clerk webhooks verify their HMAC signatures
  before any side effect runs.
- **CSRF**: Server Actions ship built-in origin checks; API routes either
  require a Clerk session (SameSite=Lax cookies), a webhook signature, or
  a `CRON_SECRET` bearer token.

### Observability

- **PostHog**: client + server adapters emit feature usage events. Server
  events go through `lib/posthog/server.ts` with a short flush window so
  edge/API handlers don't block.
- **Health check**: `GET /api/health` returns a 200/503 with DB + Redis
  latencies, rate-limited to 10/min per IP.

## Testing

Playwright E2E lives under `tests/e2e/`. The first run captures a signed-in
professional session into `tests/.auth/professional.json` so subsequent specs
can skip the sign-in flow.

```bash
npx playwright install           # first-time only
npm run test                     # all specs
npx playwright test tests/e2e/auth.spec.ts   # single file
```

Two Clerk env vars for local test-mode sign-in are consumed by
`tests/fixtures/auth.setup.ts`:

```
E2E_PROFESSIONAL_EMAIL=pro+clerk_test@test.corepro.app
E2E_PROFESSIONAL_CODE=424242
```

Clerk's test mode auto-verifies any `+clerk_test` address with the code
`424242`; see Clerk's docs for the list.

## Deployment

The app is Vercel-first but runs on any Node 20+ host. Set every env var
from `.env.local.example`. Webhook URLs (Stripe, Clerk) point at
`/api/webhooks/stripe` and `/api/webhooks/clerk`; both require their
signing secrets to be configured server-side. Scheduled jobs run on
Trigger.dev (preferred) or Vercel Cron against `/api/cron/*` with a
`CRON_SECRET` header.

## License

Proprietary / internal. See `CONTRIBUTING.md` for conventions.
