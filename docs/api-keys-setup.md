# API Keys & Secrets Setup Guide

Complete guide for obtaining every API key and secret required by the CorePro project. Each section covers account creation, where to find credentials, pricing, and important notes.

> **Last updated:** April 2026

---

## Table of Contents

1. [Quick Reference (.env.local)](#1-quick-reference)
2. [Clerk (Authentication)](#2-clerk-authentication)
3. [Supabase (Database, Storage, Realtime)](#3-supabase-database-storage-realtime)
4. [Stripe (Payments)](#4-stripe-payments)
5. [Resend (Transactional Email)](#5-resend-transactional-email)
6. [Trigger.dev v4 (Background Jobs)](#6-triggerdev-v4-background-jobs)
7. [Sentry (Error Tracking)](#7-sentry-error-tracking)
8. [Upstash Redis (Rate Limiting)](#8-upstash-redis-rate-limiting)
9. [PostHog (Analytics)](#9-posthog-analytics)
10. [Google Calendar (Optional Integration)](#10-google-calendar-optional)

---

## 1. Quick Reference

Copy `core-pro/.env.local.example` to `core-pro/.env.local` and fill in values from each section below.

```bash
cp core-pro/.env.local.example core-pro/.env.local
```

| Variable | Source | Required |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard > API keys | Yes |
| `CLERK_SECRET_KEY` | Clerk Dashboard > API keys | Yes |
| `CLERK_WEBHOOK_SECRET` | Clerk Dashboard > Webhooks > endpoint | For webhooks |
| `NEXT_PUBLIC_SUPABASE_URL` | `supabase start` output or Supabase Dashboard | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `supabase start` output or Supabase Dashboard | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | `supabase start` output or Supabase Dashboard | Yes |
| `DATABASE_URL` | `supabase start` output or Supabase Dashboard > Connect | For migrations |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard > Developers > API keys | Yes |
| `STRIPE_SECRET_KEY` | Stripe Dashboard > Developers > API keys | Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe CLI or Dashboard > Webhooks | For webhooks |
| `STRIPE_STARTER_PRICE_ID` | Stripe Dashboard > Product catalogue | For billing |
| `STRIPE_GROWTH_PRICE_ID` | Stripe Dashboard > Product catalogue | For billing |
| `STRIPE_PRO_PRICE_ID` | Stripe Dashboard > Product catalogue | For billing |
| `RESEND_API_KEY` | Resend Dashboard > API Keys | Yes |
| `RESEND_FROM_EMAIL` | Your verified domain | Yes |
| `TRIGGER_SECRET_KEY` | Trigger.dev Dashboard > API Keys | Optional |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Sentry > Project Settings > Client Keys | Optional |
| `SENTRY_AUTH_TOKEN` | Sentry > Developer Settings > Org Auth Tokens | CI/CD only |
| `SENTRY_ORG` | Your Sentry subdomain | For source maps |
| `SENTRY_PROJECT` | Sentry project slug | For source maps |
| `UPSTASH_REDIS_REST_URL` | Upstash Console > Database details | Optional |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Console > Database details | Optional |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog > Project Settings | Optional |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` or `https://eu.i.posthog.com` | Optional |
| `GOOGLE_CALENDAR_CLIENT_ID` | Google Cloud Console > Credentials | Optional |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Google Cloud Console > Credentials | Optional |

---

## 2. Clerk (Authentication)

**Free tier:** 50,000 monthly active users (increased from 10K in Feb 2026).

### Create Account & Application

1. Go to https://clerk.com and click **"Start building"**
2. Sign up with email, GitHub, or Google
3. In the dashboard, click **"Create application"**
4. Name it (e.g. "CorePro"), select sign-in methods (email, Google, etc.)
5. Click **"Create application"**

### Get API Keys

**Dashboard URL:** https://dashboard.clerk.com > select your app > **API keys** (left sidebar)

| Variable | Where | Format |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Top of API keys page, always visible | `pk_test_...` |
| `CLERK_SECRET_KEY` | Below publishable key, click eye icon to reveal | `sk_test_...` |

> **Note (Jan 2026 change):** Only workspace members with the **Admin** role can view secret keys.

### Set Up Webhooks

1. In the sidebar, click **Webhooks**
2. Click **"Add Endpoint"**
3. Enter URL: `https://your-domain.com/api/webhooks/clerk` (use ngrok for local dev)
4. Select events: `user.created`, `user.updated`, `user.deleted`
5. Click **"Create"**
6. On the endpoint page, click the **eye icon** next to "Signing Secret"
7. Copy the `whsec_...` value

| Variable | Where |
|---|---|
| `CLERK_WEBHOOK_SECRET` | Webhooks > your endpoint > Signing Secret |

> **Naming note:** Clerk's current docs recommend `CLERK_WEBHOOK_SIGNING_SECRET`. The `verifyWebhook()` function reads that name by default. Our project uses `CLERK_WEBHOOK_SECRET` -- pass it explicitly to the verify function.

### Activate Supabase Integration

This project uses Clerk's **Native Third-Party Auth** with Supabase (no JWT templates needed). The old JWT template method was deprecated April 1, 2025.

1. **In Clerk Dashboard:** Go to Integrations > Supabase > **"Activate Supabase integration"**
2. Copy the **Clerk domain** shown (e.g. `your-app.clerk.accounts.dev`)
3. **In Supabase Dashboard:** Go to Authentication > Sign In / Up > Third Party Auth
4. Click **"Add provider"**, select **Clerk**, paste the domain
5. Click **"Create connection"**

### Dashboard URLs

| Resource | URL |
|---|---|
| Dashboard | https://dashboard.clerk.com |
| API Keys | Dashboard > [App] > API keys |
| Webhooks | Dashboard > [App] > Webhooks |
| Supabase integration docs | https://clerk.com/docs/integrations/databases/supabase |
| Pricing | https://clerk.com/pricing |

---

## 3. Supabase (Database, Storage, Realtime)

**Free tier:** 2 active projects, 500 MB database, 50K auth MAUs.

### Option A: Local Development (Recommended to Start)

**Prerequisite:** Docker must be running.

```bash
npx supabase init       # creates supabase/config.toml (already done)
npx supabase start      # pulls Docker images, starts local stack
```

The output gives you everything:

```
         API URL: http://localhost:54321          -> NEXT_PUBLIC_SUPABASE_URL
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres  -> DATABASE_URL
        anon key: eyJ...                          -> NEXT_PUBLIC_SUPABASE_ANON_KEY
service_role key: eyJ...                          -> SUPABASE_SERVICE_ROLE_KEY
```

Run `npx supabase status` anytime to see these again.

### Option B: Cloud Project

1. Go to https://database.new (shortcut) or https://supabase.com/dashboard/projects
2. Click **"New Project"**
3. Choose org, enter project name, set **database password** (save it!), pick region
4. Click **"Create new project"** -- wait ~2 minutes

### Get Cloud Credentials

**Dashboard URL:** `https://supabase.com/dashboard/project/[PROJECT-REF]/settings/api-keys`

Navigate: **Project Settings** (gear icon) > **API Keys**

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Top of API Keys page ("Project URL") | `https://[ref].supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | "anon / public" key | Safe for client-side, respects RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | "service_role / secret" key (click Reveal) | **Bypasses ALL RLS -- never expose client-side** |

### Get DATABASE_URL

Click the **"Connect"** button at the top of your project dashboard.

| Connection Type | Port | Best For |
|---|---|---|
| **Transaction mode** | 6543 | Vercel/serverless (use for production `DATABASE_URL`) |
| **Session mode** | 5432 | Long-lived connections |
| **Direct** | 5432 (different host) | Migrations from local machine, DB GUIs |

Format: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`

### Security: Anon Key vs Service Role Key

| Key | RLS Enforced | Safe for Client | Use For |
|---|---|---|---|
| Anon key | Yes | Yes | Browser calls, Realtime, Storage |
| Service role key | **No -- bypasses RLS** | **Never** | Server-side admin ops, webhooks |

### Dashboard URLs

| Resource | URL |
|---|---|
| Sign up | https://supabase.com/dashboard/sign-up |
| Create project | https://database.new |
| API Keys | `https://supabase.com/dashboard/project/[REF]/settings/api-keys` |
| Database settings | `https://supabase.com/dashboard/project/[REF]/settings/database` |
| Local Studio | http://localhost:54323 (when running locally) |
| Pricing | https://supabase.com/pricing |

---

## 4. Stripe (Payments)

**Pricing:** 2.9% + $0.30 per transaction (no monthly fees).

### Create Account

1. Go to https://dashboard.stripe.com/register
2. Sign up with email, verify email and phone
3. You get immediate access to **test mode** (no business verification needed)

### Get API Keys

**Dashboard URL:** https://dashboard.stripe.com/test/apikeys

Navigate: **Developers** (bottom-left) > **API keys**. Make sure "Test mode" is active.

| Variable | Where | Format |
|---|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | "Standard keys" section, always visible | `pk_test_...` |
| `STRIPE_SECRET_KEY` | "Standard keys", click **"Reveal test key"** | `sk_test_...` |

> The secret key is shown **only once** when first created. Copy it immediately.

### Set Up Webhook (Production)

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click **"Add endpoint"**
3. URL: `https://your-domain.com/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created` / `updated` / `deleted`
   - `invoice.payment_succeeded` / `payment_failed`
5. Click **"Add endpoint"**
6. On the endpoint page, click **"Reveal"** next to "Signing secret"
7. Copy the `whsec_...` value

### Set Up Webhook (Local Development with Stripe CLI)

```bash
# Install
brew install stripe/stripe-cli/stripe

# Authenticate (opens browser)
stripe login

# Forward webhooks to local dev server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI outputs: `Your webhook signing secret is whsec_...` -- use this as `STRIPE_WEBHOOK_SECRET` for local dev. This secret is stable across CLI restarts.

```bash
# Trigger test events in a separate terminal
stripe trigger checkout.session.completed
stripe trigger invoice.payment_failed
```

### Create Price IDs

1. Go to https://dashboard.stripe.com/test/products
2. Click **"Add product"** for each tier:

| Product | Suggested Price |
|---|---|
| Starter Plan | $19/mo recurring |
| Growth Plan | $49/mo recurring |
| Pro Plan | $99/mo recurring |

3. After saving each product, find the **Price ID** (`price_...`) in the Pricing section
4. Set in `.env.local`:

```
STRIPE_STARTER_PRICE_ID=price_1Abc...
STRIPE_GROWTH_PRICE_ID=price_1Def...
STRIPE_PRO_PRICE_ID=price_1Ghi...
```

### Dashboard URLs

| Resource | URL |
|---|---|
| Register | https://dashboard.stripe.com/register |
| API keys (test) | https://dashboard.stripe.com/test/apikeys |
| Webhooks (test) | https://dashboard.stripe.com/test/webhooks |
| Products (test) | https://dashboard.stripe.com/test/products |
| Stripe CLI docs | https://docs.stripe.com/stripe-cli |

---

## 5. Resend (Transactional Email)

**Free tier:** 3,000 emails/month, 100/day limit, 1 domain.

### Create Account

1. Go to https://resend.com/signup
2. Sign up with email or GitHub
3. Confirm your email

### Get API Key

1. Go to https://resend.com/api-keys
2. Click **"Create API Key"**
3. Name it (e.g. "CorePro Dev"), choose permission:
   - **Full Access** -- good for development
   - **Sending Access** -- recommended for production (least privilege)
4. Click **"Add"**
5. **Copy the key immediately** -- shown only once. Format: `re_c1tpEyD8_...`

| Variable | Where |
|---|---|
| `RESEND_API_KEY` | https://resend.com/api-keys |

### Verify Domain (Required to Send to Anyone)

Without a verified domain, you can only send to the account owner's email.

1. Go to https://resend.com/domains
2. Click **"Add Domain"**
3. Enter your domain (tip: use a subdomain like `mail.corepro.com` to isolate email reputation)
4. Resend generates DNS records you must add:
   - **SPF** (TXT record) -- authorizes Resend's IPs
   - **DKIM** (TXT record) -- cryptographic email signing
   - **MX** record -- bounce handling
   - **DMARC** (TXT, optional but recommended)
5. Add records at your DNS provider (Cloudflare, Namecheap, etc.)
6. Return to Resend and click **"Verify DNS Records"**
7. Once verified, set `RESEND_FROM_EMAIL=noreply@mail.corepro.com`

> For local dev without a domain, use `RESEND_FROM_EMAIL=onboarding@resend.dev` (Resend's test domain).

### Dashboard URLs

| Resource | URL |
|---|---|
| Dashboard | https://resend.com/overview |
| API Keys | https://resend.com/api-keys |
| Domains | https://resend.com/domains |
| Pricing | https://resend.com/pricing |

---

## 6. Trigger.dev v4 (Background Jobs)

**Free tier:** $5/mo compute credits included, 20 concurrent runs, 10 schedules.

> **Important:** Trigger.dev v3 deploys stopped working April 1, 2026. This project uses v4.

### Create Account & Project

1. Go to https://cloud.trigger.dev and sign up (GitHub or email)
2. The onboarding wizard creates your Organization and Project

**Or use the CLI (recommended for existing projects):**

```bash
npx trigger.dev@latest init
```

This authenticates via browser, installs the SDK, creates a `/trigger` directory, and generates `trigger.config.ts`.

```bash
# Start the dev server
npx trigger.dev@latest dev
```

### Get Secret Key

1. Log into https://cloud.trigger.dev
2. Select your project
3. Go to **API Keys** page

Each environment has its own key:

| Environment | Key Format |
|---|---|
| Development | `tr_dev_...` |
| Staging | `tr_stg_...` |
| Production | `tr_prod_...` |

| Variable | Where | Notes |
|---|---|---|
| `TRIGGER_SECRET_KEY` | API Keys page in project dashboard | Use `tr_dev_...` for local dev |
| `TRIGGER_API_URL` | Default: `https://api.trigger.dev` | Only change if self-hosting |

### Dashboard URLs

| Resource | URL |
|---|---|
| Cloud Dashboard | https://cloud.trigger.dev |
| Quick Start | https://trigger.dev/docs/quick-start |
| v3 Migration Guide | https://trigger.dev/docs/migrating-from-v3 |
| Pricing | https://trigger.dev/pricing |

---

## 7. Sentry (Error Tracking)

**Free tier:** 5,000 errors/month, 1 user, 30-day retention.

### Create Account & Project

1. Go to https://sentry.io/signup/
2. Sign up with email, GitHub, Google, or Azure DevOps
3. Create your first project: select **Next.js** as the platform
4. Name the project (e.g. "core-pro") -- this becomes your **project slug**

### Get DSN

**Dashboard path:** Settings > Projects > [Your Project] > **Client Keys (DSN)**

**Direct URL:** `https://[org-slug].sentry.io/settings/projects/[project-slug]/keys/`

| Variable | Where | Notes |
|---|---|---|
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Client Keys page | Safe to expose publicly (only permits event submission) |

Format: `https://[PUBLIC_KEY]@[ORG_ID].ingest.us.sentry.io/[PROJECT_ID]`

Use the same value for both `SENTRY_DSN` (server) and `NEXT_PUBLIC_SENTRY_DSN` (client).

### Get Org and Project Slugs

| Variable | Where |
|---|---|
| `SENTRY_ORG` | Your Sentry subdomain: `https://[org-slug].sentry.io/` |
| `SENTRY_PROJECT` | Settings > Projects > your project -- slug is in the URL |

### Get Auth Token (For Source Map Uploads)

This is used at **build time** for uploading source maps. Store it in **CI/CD environment variables only** -- not in `.env.local`.

1. Go to **Settings > Developer Settings > Organization Auth Tokens**
   - Direct URL: `https://[org-slug].sentry.io/settings/developer-settings/`
2. Click **"Create New Token"**
3. **Copy immediately** -- shown only once
4. Requires **Manager or Admin** org role

| Variable | Where | Security |
|---|---|---|
| `SENTRY_AUTH_TOKEN` | Developer Settings > Org Auth Tokens | **CI/CD only. Never commit or expose.** |

> For local dev, source maps work without the auth token -- they just won't be uploaded to Sentry. You only need `SENTRY_AUTH_TOKEN` in your deployment pipeline.

### Dashboard URLs

| Resource | URL |
|---|---|
| Sign up | https://sentry.io/signup/ |
| Client Keys (DSN) | `https://[org].sentry.io/settings/projects/[project]/keys/` |
| Auth Tokens | `https://[org].sentry.io/settings/developer-settings/` |
| Pricing | https://sentry.io/pricing/ |

---

## 8. Upstash Redis (Rate Limiting)

**Free tier:** 1 database, 256 MB, 500K commands/month.

### Create Account & Database

1. Go to https://console.upstash.com/
2. Sign up with GitHub, Google, Amazon, or email
3. Click **"+ Create Database"**
4. Enter a name, select **Primary Region** (pick closest to your deployment, e.g. `us-east-1` for Vercel)
5. Click **Create** -- ready immediately

### Get Credentials

On the database detail page, look for the **REST API** section (or click the `.env` tab for copy-paste format):

| Variable | Where | Format |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | Database detail > REST API section | `https://[id]-[region].upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Database detail > REST API section | Long alphanumeric string |

> **Pro tip:** The `.env` tab on the database page shows both values ready to copy-paste.

### Dashboard URLs

| Resource | URL |
|---|---|
| Console | https://console.upstash.com/ |
| Getting Started | https://upstash.com/docs/redis/overall/getstarted |
| Pricing | https://upstash.com/pricing |

---

## 9. PostHog (Analytics)

**Free tier:** 1M events/month, 5K session replays, 1M feature flag requests.

### Create Account

1. Go to https://app.posthog.com/signup
2. Sign up with email, Google, GitHub, or GitLab
3. Choose region: **US Cloud** or **EU Cloud** (for GDPR)
4. Create your first project

### Get Credentials

**Dashboard URL:** Settings (gear icon) > **Project Settings**

| Variable | Where | Format |
|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | Project Settings > Project API Key | `phc_...` (safe for client-side) |
| `NEXT_PUBLIC_POSTHOG_HOST` | Depends on region choice | See below |

| Region | Host URL |
|---|---|
| US Cloud | `https://us.i.posthog.com` |
| EU Cloud | `https://eu.i.posthog.com` |
| Self-hosted | Your own domain |

> Note the `i.` subdomain -- this is the **ingestion** endpoint, distinct from the dashboard URL.

### Dashboard URLs

| Resource | URL |
|---|---|
| Sign up | https://app.posthog.com/signup |
| Project Settings | https://app.posthog.com/project/settings |
| Next.js docs | https://posthog.com/docs/libraries/next-js |
| Pricing | https://posthog.com/pricing |

---

## 10. Google Calendar (Optional)

**Free:** Google Calendar API has no per-call charge. Default quota: 1M queries/day.

### Create Google Cloud Project

1. Go to https://console.cloud.google.com/projectcreate
2. Name the project (e.g. "nucleus-core-pro")
3. Click **"Create"**

### Enable the Calendar API

1. Go to https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
2. Click **"Enable"**

### Configure OAuth Consent Screen

1. Go to https://console.cloud.google.com/apis/credentials/consent
2. Choose **External** (for any Google account)
3. Fill in app name, support email, developer contact
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar` (full access)
   - `https://www.googleapis.com/auth/calendar.events` (events only)
5. Add **test users** (while in Testing mode, only listed users can authorize -- tokens expire after 7 days)

### Create OAuth Credentials

1. Go to https://console.cloud.google.com/apis/credentials
2. Click **"+ Create Credentials"** > **"OAuth client ID"**
3. Application type: **Web application**
4. Authorized JavaScript origins:
   - `http://localhost:3000` (local)
   - `https://yourdomain.com` (production)
5. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (local)
   - `https://yourdomain.com/api/auth/callback/google` (production)
6. Click **"Create"**
7. Copy the credentials:

| Variable | Where | Format |
|---|---|---|
| `GOOGLE_CALENDAR_CLIENT_ID` | OAuth client creation dialog | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | OAuth client creation dialog | `GOCSPX-...` |

> Redirect URIs must match **exactly** -- no trailing slashes, no wildcards.

### Console URLs

| Resource | URL |
|---|---|
| Create project | https://console.cloud.google.com/projectcreate |
| Enable Calendar API | https://console.cloud.google.com/apis/library/calendar-json.googleapis.com |
| OAuth consent | https://console.cloud.google.com/apis/credentials/consent |
| Credentials | https://console.cloud.google.com/apis/credentials |
| Quotas | https://console.cloud.google.com/apis/api/calendar-json.googleapis.com/quotas |

---

## Pricing Summary

| Service | Free Tier | Paid From |
|---|---|---|
| **Clerk** | 50K MAU | $25/mo (Pro) |
| **Supabase** | 2 projects, 500 MB DB, 50K auth MAU | $25/mo (Pro) |
| **Stripe** | No monthly fee | 2.9% + $0.30/txn |
| **Resend** | 3K emails/mo | $20/mo (Pro) |
| **Trigger.dev** | $5 compute credits, 20 concurrent | $10/mo (Hobby) |
| **Sentry** | 5K errors/mo | $26/mo (Team) |
| **Upstash Redis** | 256 MB, 500K cmds/mo | $0.20/100K cmds (Pay-as-you-go) |
| **PostHog** | 1M events/mo | Pay-as-you-go |
| **Google Calendar API** | 1M queries/day | Free |

**Estimated monthly cost for a solo developer / early-stage project: $0** (all free tiers are sufficient).
