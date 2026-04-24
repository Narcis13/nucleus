# Nucleus on Rails — Implementation Plan

**Version:** 1.0
**Date:** 2026-04-23
**Author:** Narcis (with architectural assist)
**Purpose:** Rebuild the CorePro/Nucleus boilerplate on Rails 8 + Hotwire after deciding to leave Next.js 16 + RSC behind. Same product, same locked-in dependencies (Clerk, Supabase, Resend, Stripe), different runtime.
**Predecessor:** `nucleus-Implementation-Plan.md` (Next.js plan; reference only — do not re-execute)
**Vertical PRDs (unchanged, language-agnostic):**
- `docs/EstateCorePro-PRD-v1.0.md`
- `docs/FitCorePro-PRD-v1.0.md`

---

## 0. How To Use This Document

This plan has two parts:

- **Part A — Spike** (2 weeks): Five focused days of build that prove the four risky integrations work cleanly in Rails before any serious rewrite begins. If the spike fails, you fall back to pinning Next 15 LTS and refactoring the 117 `revalidatePath` calls. If it succeeds, Part B is greenlit.
- **Part B — Full Nucleus** (28 sessions): Sequential, dependency-ordered rebuild of every nucleus feature shipped or planned in the Next.js version. Each session is sized for a single Claude Code working session (~2–4 hours).

**Conventions for every session:**
1. Each session has *one* commit at minimum, message format `Rs{N}: <summary>` (e.g. `Rs5: clients CRUD + tags`).
2. Migrations are reversible. Use `strong_migrations` gem to enforce.
3. New tables get `created_at` + `updated_at` (Rails default) and an `acts_as_tenant :professional` scope where applicable.
4. Every controller action is covered by a system test (Capybara + Cuprite) OR a request spec — never both, never neither.
5. i18n: every UI string goes through `I18n.t`. Romanian (`config/locales/ro.yml`) is the default, English (`en.yml`) is the secondary. No hardcoded strings.
6. Stimulus controllers replace what was a `'use client'` blob in the React version. JavaScript is small, scoped, and addressable from the DOM.
7. ViewComponent + Phlex (optional, for power users) replace React components. Lookbook gives you preview-driven dev.

---

## 1. Why Rails (One-Page Recap)

| Concern | Next.js (current) | Rails 8 (proposed) |
|---|---|---|
| Auth | Clerk via `@clerk/nextjs` (1st party) | Clerk via `clerk-sdk-ruby` (1st party) |
| DB | Supabase + Drizzle + RLS via `withRLS` tx (custom) | Supabase Postgres + ActiveRecord + `acts_as_tenant` + RLS as defense-in-depth |
| Real-time | Supabase Realtime (separate WS) | ActionCable (in-process, Solid Cable adapter on PG) |
| Background jobs | Trigger.dev v4 (3rd party SaaS) | SolidQueue (in-process, on PG) |
| Cache | Solid Cache equivalent doesn't exist; relies on Next ISR + revalidatePath | Solid Cache (PG-backed, no Redis needed) |
| Email | Resend SDK + React Email | Resend gem + ActionMailer + Mjml-rails templates |
| Stripe | Hand-rolled webhooks + plan gating | `pay` gem (the gold-standard Rails subscription lib) |
| PDF | `@react-pdf/renderer` (cold-start prone) | Prawn (data tables, contracts) + ChromicPDF (HTML→PDF for branded reports) |
| Forms (drag-drop) | `@dnd-kit` in React | `Sortable.js` via Stimulus controller (~50 LOC) |
| i18n | `next-intl` | Rails `I18n` (built-in, 20-year track record) |
| Deploy | Vercel (per-second pricing, edge complexity) | Kamal 2 on Hetzner CX22 (€5/month, single VPS, Docker, zero-downtime) |
| Observability | Sentry + PostHog | Sentry (`sentry-rails`) + PostHog (Ruby SDK or Ahoy) |
| Rate limit | Upstash Redis + `@upstash/ratelimit` | `rack-attack` (in-process, no Redis required) |

**Net effect:** Solid trio (Queue + Cache + Cable) eliminates Redis as a dependency. Rails 8 + Kamal + Hetzner replaces a 5-vendor production stack with one VPS + Postgres. **Same features, ~70% less infrastructure surface, zero RSC cache bugs.**

---

# PART A — Two-Week Spike

**Goal:** Prove the four highest-risk integrations work in Rails 8 with the locked-in vendors. Decide go/no-go before touching the bulk port.

**Output:** A throwaway `nucleus-rails-spike/` repo (separate from `core-pro/`) running locally with one professional, one client, one chat thread, one Stripe subscription, and verified RLS isolation between two tenant accounts.

**Working hours assumed:** 4 focused hours/day, 5 days/week, 2 weeks = ~40 hours total.

---

## Spike Day 1 — Project Setup & Postgres

### Goal
Greenfield Rails 8 app talking to your existing Supabase Postgres. Zero auth yet. Just confirm the database connection, migrations, and console work.

### Tasks
1. Install Ruby 3.4.x via `mise` or `rbenv`. (Rails 8 minimum is 3.2; pick the latest stable.)
2. `gem install rails` (Rails 8.1 latest stable as of April 2026).
3. `rails new nucleus-rails-spike --database=postgresql --css=tailwind --javascript=importmap --skip-jbuilder`.
4. `cd nucleus-rails-spike`. Add to `Gemfile`:
   ```ruby
   gem "strong_migrations"
   gem "dotenv-rails", groups: [:development, :test]
   gem "lookbook", group: :development
   gem "view_component"
   gem "annotaterb", group: :development
   ```
5. Configure `config/database.yml` to point at Supabase Postgres:
   ```yaml
   development:
     <<: *default
     url: <%= ENV.fetch("DATABASE_URL") %>
     pool: 5
   ```
6. Use Supabase **session pooler** URL (port 5432, NOT the transaction pooler on 6543 — Rails connection pooling needs full session semantics for `SET LOCAL` to work later).
7. `rails db:create` should be skipped (DB already exists in Supabase). Run `rails db:migrate` once empty migration set exists — proves the connection.
8. Generate one trivial scaffold: `rails g scaffold Note title:string body:text`. Migrate. Boot `bin/dev`. Visit `http://localhost:3000/notes`. Create a row. Confirm it appears in the Supabase dashboard.

### Verification
- `rails console` connects, can do `Note.count`.
- A row created in Rails appears in Supabase Studio.
- `bin/dev` boots without errors and Tailwind CSS works (the scaffold has Tailwind classes that should style).

### Risks to watch
- **SSL connection**: Supabase requires SSL. Add `?sslmode=require` to the DATABASE_URL.
- **Connection pooler mode**: must be session, not transaction. Verify in Supabase dashboard.
- **Encoding**: Rails defaults to UTF-8; Supabase is UTF-8. No action needed.

---

## Spike Day 2 — Clerk Authentication

### Goal
Sign in via Clerk, get a Rails session that maps to a Clerk user, protect a route.

### Tasks
1. Add to `Gemfile`:
   ```ruby
   gem "clerk-sdk-ruby"
   gem "clerk-rails"  # if available; otherwise direct middleware mounting
   ```
2. Set env vars in `.env`:
   ```
   CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   CLERK_API_BASE=https://api.clerk.com/v1
   ```
3. Add Clerk middleware in `config/application.rb`:
   ```ruby
   config.middleware.use Clerk::Rack::Middleware
   ```
4. Create `app/controllers/concerns/clerk_authenticatable.rb`:
   ```ruby
   module ClerkAuthenticatable
     extend ActiveSupport::Concern

     included do
       before_action :require_clerk_user!
       helper_method :current_clerk_user, :current_professional
     end

     def current_clerk_user
       @current_clerk_user ||= request.env["clerk"]&.user
     end

     def current_professional
       return nil unless current_clerk_user
       @current_professional ||= Professional.find_or_create_by!(clerk_user_id: current_clerk_user.id) do |p|
         p.email = current_clerk_user.email_addresses.first&.email_address
         p.full_name = "#{current_clerk_user.first_name} #{current_clerk_user.last_name}".strip
       end
     end

     def require_clerk_user!
       redirect_to "/sign-in" unless current_clerk_user
     end
   end
   ```
5. Build minimal sign-in view that loads Clerk's frontend SDK from CDN and mounts the `<SignIn />` component. (Clerk's hosted Account Portal also works — fewer moving parts.)
6. Generate `Professional` model: `rails g model Professional clerk_user_id:string:uniq email:string full_name:string`. Migrate.
7. Create a `DashboardController` with a `before_action :require_clerk_user!`, a single `index` action, a view that renders "Hello {{current_professional.full_name}}".

### Verification
- Visiting `/dashboard` while signed-out redirects to `/sign-in`.
- Clerk hosted sign-in completes, lands on `/dashboard`, shows your name.
- A `Professional` row exists in Postgres with your `clerk_user_id`.
- Webhook endpoint works (test via `ngrok` + Clerk dashboard webhook ping).

### Risks to watch
- **JWT verification**: `clerk-sdk-ruby` should verify Clerk session tokens against Clerk's JWKS. If middleware doesn't auto-verify, do it explicitly.
- **Organizations**: don't tackle yet. Spike is single-tenant for now; orgs come in Part B Session R3.
- **CSRF**: ActionController CSRF tokens may conflict with Clerk's own session tokens. Use `protect_from_forgery with: :null_session` for endpoints that receive Clerk webhooks; keep CSRF on for normal browser POSTs.

---

## Spike Day 3 — Multi-Tenancy (acts_as_tenant + RLS Defense-in-Depth)

### Goal
Two test professionals, each creating clients, must not see each other's data — even if a controller bug forgets to scope a query.

### Tasks
1. Add to `Gemfile`:
   ```ruby
   gem "acts_as_tenant"
   ```
2. Generate `Client` model with `professional` reference:
   ```sh
   rails g model Client professional:references full_name:string email:string phone:string
   ```
3. In `app/models/client.rb`:
   ```ruby
   class Client < ApplicationRecord
     acts_as_tenant :professional, optional: false
     belongs_to :professional
     validates :full_name, presence: true
   end
   ```
4. In `app/controllers/application_controller.rb`:
   ```ruby
   class ApplicationController < ActionController::Base
     include ClerkAuthenticatable
     set_current_tenant_through_filter
     before_action :set_tenant

     private

     def set_tenant
       set_current_tenant(current_professional) if current_professional
     end
   end
   ```
5. Add Postgres RLS as defense-in-depth (run as raw migration):
   ```sql
   ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
   CREATE POLICY clients_tenant_isolation ON clients
     USING (professional_id = current_setting('app.professional_id', true)::uuid);
   ```
   And in `ApplicationRecord` (or a concern), set the GUC per request:
   ```ruby
   class ApplicationRecord < ActiveRecord::Base
     primary_abstract_class

     def self.with_tenant_setting(professional_id, &block)
       connection.execute("SET LOCAL app.professional_id = '#{professional_id}'")
       yield
     end
   end
   ```
   Wrap each request in `ApplicationRecord.with_tenant_setting(current_professional.id) { yield }` via an `around_action`.
6. Build trivial CRUD: `rails g scaffold Client full_name:string email:string`. Don't add `professional_id` to the scaffold — `acts_as_tenant` injects it.
7. **Write the test that proves isolation:**
   ```ruby
   # test/system/multi_tenancy_test.rb
   test "professional A cannot see professional B's clients" do
     prof_a = professionals(:alice)
     prof_b = professionals(:bob)
     ActsAsTenant.with_tenant(prof_a) { Client.create!(full_name: "Alice's client") }
     ActsAsTenant.with_tenant(prof_b) { Client.create!(full_name: "Bob's client") }

     ActsAsTenant.with_tenant(prof_a) do
       assert_equal ["Alice's client"], Client.pluck(:full_name)
     end
   end
   ```
8. **Write the RLS leak test** — bypass `acts_as_tenant` to prove RLS catches it:
   ```ruby
   test "RLS blocks cross-tenant reads even without acts_as_tenant" do
     prof_a = professionals(:alice)
     prof_b = professionals(:bob)
     ActsAsTenant.without_tenant { Client.create!(professional: prof_b, full_name: "Bob's") }

     ApplicationRecord.with_tenant_setting(prof_a.id) do
       assert_empty ActsAsTenant.without_tenant { Client.unscoped.all }
     end
   end
   ```

### Verification
- Both isolation tests pass.
- Manual: sign in as two different Clerk users, create clients in each, confirm zero leakage.

### Risks to watch
- **`SET LOCAL` requires a transaction**: ActiveRecord auto-wraps writes in transactions, but reads outside transactions won't have the GUC. Either wrap reads in `ActiveRecord::Base.transaction` or use `SET` (without LOCAL) and reset on connection checkin. The simpler path: `around_action` opens an explicit transaction for the request body. (Performance: PG transactions are cheap; this is fine.)
- **Connection reuse**: a connection returned to the pool with a stale GUC could leak. Reset in `after_action` or use ActiveSupport notifications to clear on checkout.

---

## Spike Day 4 — Real-Time Messaging via ActionCable

### Goal
A professional and a client can exchange messages in real time, in a single conversation thread, with messages persisted to Postgres.

### Tasks
1. ActionCable ships with Rails. Solid Cable (PG-backed, no Redis) is the Rails 8 default — verify in `config/cable.yml`.
2. Generate models:
   ```sh
   rails g model Conversation professional:references client:references
   rails g model Message conversation:references sender_clerk_id:string body:text
   ```
3. Add `acts_as_tenant :professional` to `Conversation`. Messages inherit tenancy via the conversation.
4. Generate channel: `rails g channel Conversation`.
   ```ruby
   # app/channels/conversation_channel.rb
   class ConversationChannel < ApplicationCable::Channel
     def subscribed
       conversation = Conversation.find(params[:id])
       # Authorize: must be the professional or the client of this conversation
       reject unless can_access?(conversation)
       stream_for conversation
     end

     def receive(data)
       conversation = Conversation.find(params[:id])
       message = conversation.messages.create!(
         sender_clerk_id: current_user.id,
         body: data["body"]
       )
       ConversationChannel.broadcast_to(conversation, message.as_json)
     end
   end
   ```
5. Build a Hotwire-driven chat view. Use `<%= turbo_stream_from conversation %>` in the view; new messages broadcast via `after_create_commit { broadcast_append_to conversation, target: "messages" }` on the `Message` model.
6. The chat input is a regular form posting to `messages#create`, returning `turbo_stream` with no full-page reload.

### Verification
- Open the same conversation in two browser tabs (one as professional, one as client signed in via different Clerk users).
- Send a message in tab A. It appears in tab B within ~100ms with no page refresh.
- Restart the server. Messages are still there.
- Kill the database connection. New messages fail gracefully (don't broadcast a message that wasn't persisted).

### Risks to watch
- **Cable auth**: `ApplicationCable::Connection#connect` must verify the Clerk session token from the cookie/header. Don't trust client-provided user IDs.
- **Solid Cable scale**: fine for tens of thousands of concurrent connections per node. If you ever hit that, swap adapter to Redis.

---

## Spike Day 5 — Stripe Subscription via Pay Gem + Decision Gate

### Goal
A professional can subscribe to a plan, hit a limit, and get blocked. Stripe webhooks update the database. Customer portal works.

### Tasks
1. Add to `Gemfile`:
   ```ruby
   gem "pay", "~> 8.0"
   gem "stripe", "~> 12.0"
   gem "receipts"
   ```
2. `bin/rails pay:install:migrations && bin/rails db:migrate`.
3. In `Professional`:
   ```ruby
   class Professional < ApplicationRecord
     pay_customer
   end
   ```
4. Configure Stripe keys in `config/initializers/pay.rb` (or via `Pay.setup do |config|`).
5. Define plans in `config/initializers/plans.rb`:
   ```ruby
   PLANS = {
     "starter" => { stripe_price_id: ENV["STRIPE_STARTER_PRICE"], max_clients: 15 },
     "growth"  => { stripe_price_id: ENV["STRIPE_GROWTH_PRICE"],  max_clients: 50 },
     "pro"     => { stripe_price_id: ENV["STRIPE_PRO_PRICE"],     max_clients: 150 }
   }.freeze
   ```
6. Build a `BillingsController` with `checkout` (creates Pay::Checkout) and `portal` (creates Customer Portal session) actions.
7. Add a guard: `before_action :require_active_subscription!` on `ClientsController#create`. If `current_professional.payment_processor.subscribed?` is false OR client count exceeds `max_clients`, redirect to `/billing/upgrade`.
8. Set up webhook endpoint at `/webhooks/stripe`. Pay gem handles the verification automatically — confirm it works with `stripe listen --forward-to localhost:3000/webhooks/stripe`.

### Verification
- Subscribe to "starter" plan via Stripe test card 4242-4242-4242-4242.
- Create 15 clients. Try to create the 16th — get blocked with a clear upgrade message.
- Open Customer Portal, cancel subscription. Webhook fires. `current_professional.payment_processor.subscribed?` returns false.
- Try to create another client. Get blocked.

### The decision gate
At the end of Day 5, answer these questions honestly. If 3 or more are "yes," ship Part B. If 2 or fewer, fall back to Next 15 LTS pin + revalidatePath refactor.

1. Did Clerk + Rails feel clean (sub-50 LOC of integration code, no monkey-patching)?
2. Did `acts_as_tenant` + RLS feel airtight (both isolation tests pass first try)?
3. Did ActionCable with Solid Cable handle real-time without a separate service or Redis?
4. Did Pay gem handle Stripe end-to-end (subscribe + portal + webhook) in under an hour?
5. Counting LOC: is the spike's working surface area smaller than the equivalent in `core-pro/`? (Estimate: spike will be ~800 LOC vs `core-pro` ~2,500 LOC for the same features. If it's *bigger*, something is wrong.)
6. Subjectively: does it feel **calm**? Are you debugging your code or framework quirks?

---

# PART B — Full Nucleus Rebuild (28 Sessions)

**Trigger condition:** Spike passed.
**Working repo:** `nucleus-rails/` (sibling to `core-pro/`). Treat `core-pro/` as a reference implementation — read it for product behavior, do not depend on it.
**Branch strategy:** Land each session on `main` with one commit. No long-lived branches.

---

## Phase 1 — Foundation (Rs1–Rs4)

### Session Rs1 — Project Bootstrap & Tooling

**Goal:** Replace the spike with a clean, opinionated Rails 8 project that has every tool you'll need pre-wired.

**Stack additions (vs spike):**
```ruby
# Authorization
gem "pundit"

# View layer
gem "view_component", "~> 4.0"
gem "phlex-rails"  # optional; use Phlex for components that benefit from pure-Ruby

# Pagination
gem "pagy", "~> 9.0"

# Forms
gem "simple_form"

# Search & filtering
gem "ransack"

# Background jobs
# (SolidQueue is Rails 8 default — confirm enabled)

# Email
gem "resend"
gem "mjml-rails"  # MJML → responsive HTML for marketing emails
gem "premailer-rails"  # CSS inlining

# PDF
gem "prawn", "~> 2.5"
gem "prawn-table"
gem "chromic_pdf"  # HTML→PDF via headless Chrome
gem "image_processing", "~> 1.13"  # ActiveStorage variants
gem "ruby-vips"  # faster than mini_magick

# Notifications
gem "noticed", "~> 2.6"

# iCal / scheduling
gem "icalendar"
gem "ice_cube"  # recurring events

# Web push
gem "web-push"

# CSV
gem "csv"  # stdlib in Ruby 3.4+

# Observability
gem "sentry-ruby"
gem "sentry-rails"
gem "ahoy_matey"  # first-party visit/event tracking

# Rate limiting
gem "rack-attack"

# Security
gem "rack-cors"
gem "secure_headers"

# Dev/test
group :development, :test do
  gem "rspec-rails"
  gem "factory_bot_rails"
  gem "faker"
  gem "pry-byebug"
end

group :test do
  gem "capybara"
  gem "cuprite"  # CDP-based, faster than Selenium
  gem "shoulda-matchers"
  gem "vcr"
  gem "webmock"
end

group :development do
  gem "bullet"  # N+1 detection in dev
  gem "letter_opener"  # email preview in browser
  gem "annotaterb"
  gem "lookbook"
end
```

**Tasks:**
1. Set up `bin/setup` to be one-command bootstrappable.
2. Configure `bin/dev` to start: web (Puma) + Tailwind watcher + SolidQueue worker + esbuild (if needed).
3. Set up `lefthook` for pre-commit hooks: `rubocop`, `bundle exec rspec`, `brakeman`.
4. Pin Ruby version in `.ruby-version`. Pin Rails in Gemfile.lock.
5. Configure `dotenv-rails` and create `.env.development.example` with every required key.
6. Add a `Procfile.dev`:
   ```
   web: bin/rails server
   css: bin/rails tailwindcss:watch
   worker: bundle exec rake solid_queue:start
   ```

**Verification:** `bin/setup && bin/dev` from a clean clone boots the full stack with no manual steps.

---

### Session Rs2 — Auth & Session Management (Production-grade)

**Goal:** Move past spike-level Clerk integration to production-grade: organizations, role-based access, webhook handling, sign-out, account portal links.

**Tasks:**
1. Migrate `Professional` to include Clerk `org_id`:
   ```sh
   rails g migration AddClerkOrgIdToProfessionals clerk_org_id:string:uniq
   ```
2. Build `Clerk::WebhooksController` to handle `user.created`, `user.updated`, `user.deleted`, `organization.created`, `organizationMembership.created`. Use Clerk's webhook signature verification (Svix).
3. Build a `Role` system using Pundit. Roles: `owner` (broker/team lead), `member` (agent/trainer), `client` (B2C side).
4. Add Clerk's hosted `<UserButton />` and `<OrganizationSwitcher />` to the dashboard layout via `<turbo-frame>` islands that load Clerk's frontend SDK only when needed.
5. Sign-out clears Rails session AND calls Clerk's signOut. Test that hitting `/dashboard` after sign-out actually redirects.
6. Add CSRF exception only for the webhook endpoint. Everything else stays CSRF-protected.

**Verification:**
- Webhook test from Clerk dashboard creates a Professional + Organization in your DB.
- Switching organizations via Clerk UI updates the Rails session and changes the visible tenant.
- Two users in the same Clerk org see the same data (when the role allows); two users in different orgs see nothing of each other.

---

### Session Rs3 — Multi-Tenancy Production Polish

**Goal:** Harden the spike's multi-tenancy. Add organization-level scoping (an org may contain multiple professionals), role-based read/write splits, and an audit trail.

**Tasks:**
1. New tables: `organizations` (mirrors Clerk org), `organization_memberships` (FK to professional + organization + role).
2. Refactor `acts_as_tenant` to scope on `organization` rather than `professional` for tables that should be org-shared (clients, leads, services). Keep `professional`-scoped for personal-only data (calendar slots, internal notes).
3. Update RLS policies in Postgres to match the new scope:
   ```sql
   CREATE POLICY clients_org_isolation ON clients
     USING (organization_id = current_setting('app.organization_id', true)::uuid);
   ```
4. Add an `Audited::Trail` (or hand-rolled `audit_logs` table) that captures: actor, action, model, object_id, before/after diff, ip, user_agent. Required for GDPR + compliance later.
5. Pundit policies for every controller: `index?`, `show?`, `create?`, `update?`, `destroy?`. Default-deny: no policy = no access.

**Verification:**
- A `member` role cannot delete clients owned by an `owner`.
- Switching orgs in Clerk + reloading immediately changes the visible client list.
- Audit log captures every CRUD on clients.

---

### Session Rs4 — Design System & Layouts

**Goal:** Lock in the visual language. Tailwind v4 + ViewComponent + Lookbook so every later session can compose UI without reinventing.

**Tasks:**
1. Configure Tailwind v4 via `tailwindcss-rails` gem. Use the `@theme` directive for design tokens.
2. Build base layouts: `application.html.erb` (marketing), `dashboard.html.erb` (sidebar + topbar + Turbo frame for content), `portal.html.erb` (branded with professional's colors), `micro_site.html.erb` (public).
3. Build a kit of ViewComponents in `app/components/ui/`:
   - `ButtonComponent` (variants: primary/secondary/ghost/destructive)
   - `CardComponent`
   - `BadgeComponent`
   - `EmptyStateComponent`
   - `DataTableComponent` (with Ransack-powered sort + Pagy pagination)
   - `KanbanComponent` (Stimulus-driven, Sortable.js)
   - `FormFieldComponent` (wraps Simple Form)
   - `ModalComponent` (Turbo frame + native `<dialog>`)
   - `ToastComponent` (driven by Turbo stream broadcasts)
4. Wire `Lookbook` at `/lookbook` (development only) for component preview. Every component gets a preview file.
5. Set up dark mode via Tailwind class strategy + a Stimulus controller storing preference in localStorage.

**Verification:**
- Lookbook renders every component with multiple states.
- A new dashboard page can be built in <30 minutes by composing existing components.
- Mobile-responsive (Tailwind defaults; verify by resizing).

---

### Session Rs4.5 — API Foundation (Service Objects + JSON API + PAT Auth)

**Goal:** Establish the pattern that lets every later session ship an API endpoint alongside its HTML controller without duplicating logic. Service objects own business rules; HTML and JSON controllers are thin adapters around them.

**Tasks:**
1. `ApplicationService` base class with `.call` returning a `Result` (success/failure + payload + errors). All write actions from Rs5 onward go through one. No business logic in controllers.
2. `/api/v1` namespace mounted in `routes.rb`. `Api::V1::BaseController < ActionController::API` (no cookies, no CSRF — pure token).
3. `PersonalAccessToken` model: `professional_id`, `name`, `token_digest` (bcrypt, never store plaintext), `scopes` (jsonb, e.g. `["clients:read", "appointments:write"]`), `last_used_at`, `revoked_at`. UI to issue/revoke under the dashboard.
4. `Api::TokenAuth` concern: extracts `Authorization: Bearer ...`, looks up by digest, sets `Current.professional` and `Current.organization`, **then** wraps the action in `ApplicationRecord.with_tenant_setting` so RLS is enforced exactly like for browser requests. The BYPASSRLS gotcha (CLAUDE.md) applies here too.
5. JSON serialization via `alba` — faster + simpler than Jbuilder, no partial-per-type sprawl. Resource classes live in `app/resources/api/v1/`.
6. Error envelope: `{ error: { code, message, details } }`. 4xx returns the envelope; 5xx returns a request_id only. Pagination via Pagy with `Link` + `X-Total-Count` headers.
7. Rate-limit tier in `Rack::Attack` keyed on token id (default 600/min/token, 50/min for unauthenticated).
8. Example endpoint: `GET /api/v1/me` returns the authenticated professional + active scopes. Refactor the spike's `MessagesController` to use a `Messages::Create` service object — proves the pattern with a real existing controller.
9. Request specs: missing token → 401, wrong scope → 403, **cross-tenant token → 404 (not 403, no information leak)**, over rate limit → 429 with `Retry-After`, pagination headers present.
10. Document the service-object-and-two-controllers pattern in `docs/api-pattern.md` with one before/after diff. Rs5–Rs10 follow it.

**Verification:**
- `curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/me` returns 200 JSON.
- A token issued for tenant A gets 404 on tenant B's resources — confirmed by integration test that creates two orgs and asserts silent isolation.
- Revoking a token in the UI makes the next request 401 immediately (no caching).
- HTML and JSON controllers for the example resource both call the same service object — `git grep` shows zero business logic in either.
- Brakeman clean; `bundle exec rspec spec/requests/api/` green.

**Risks to watch:**
- **CSRF bypass trap:** `Api::V1::BaseController` skips CSRF only because it also rejects cookie-based sessions. If a future engineer adds cookie auth back to the API base, CSRF protection silently disappears for browser sessions too. Add a request spec that asserts an authenticated cookie is *ignored* on `/api/v1`.
- Token lookup MUST happen inside the `with_tenant_setting` block, not before it — the auth query itself needs RLS, or a leaked token from a deleted tenant could still see data.
- Don't reach for Doorkeeper / OAuth2 here. PATs are sufficient for AI agents and personal automations and are a clean base if you later add OAuth for third-party apps.

---

## Phase 2 — CRM Core (Rs5–Rs10)

### Session Rs5 — Clients (CRUD + Tags + Search)

**Goal:** Full client management: list with filters, profile with tabs, tags with colors, bulk actions, CSV import/export.

**Tasks:**
1. Models: `Client`, `Tag`, `ClientTag` (HABTM-style join). Tag belongs to organization.
2. Controllers: `ClientsController` (index, show, edit, update, destroy), `Clients::TagsController` (attach/detach), `Clients::ImportsController` (CSV upload → preview → confirm).
3. Profile view with tabs (one Turbo frame per tab — lazy-loaded):
   - Overview
   - Notes (internal — invisible to client)
   - Documents (lazy-loaded via `<turbo-frame src="...">`)
   - Messages (lazy-loaded — embeds the conversation)
   - Activity (audit log filtered to this client)
4. List view: server-side Ransack filters (status, tag, source), Pagy pagination, sort by columns. Bulk actions via Stimulus controller posting form-encoded `client_ids[]` to dedicated endpoints.
5. CSV import: stream-parse via `CSV.foreach`, validate row by row, surface errors per row, confirm before commit.
6. CSV export: stream response (`response.headers['Last-Modified'] = Time.now.httpdate`, `response.stream`).
7. Follow the Rs4.5 pattern: each write action runs through a `Clients::*` service object; `Api::V1::ClientsController` exposes index/show/create/update/destroy as JSON, sharing the service objects with the HTML controller. Scopes: `clients:read`, `clients:write`.

**Verification:**
- Import 1,000-row CSV in <10 seconds with per-row validation.
- Filter + sort + paginate works without page reloads (Turbo Drive).
- Bulk delete 50 clients in one request, audit log captures all 50.

---

### Session Rs6 — Leads Pipeline (Kanban)

**Goal:** Drag-and-drop Kanban for leads with custom stages. Activity log per lead. Conversion to client.

**Tasks:**
1. Models: `LeadStage` (per organization, ordered, has color/is_won/is_lost), `Lead`, `LeadActivity`.
2. Stage management UI: drag to reorder stages (Sortable.js + Stimulus + a simple `position` integer reorder endpoint).
3. Lead Kanban: Sortable.js between columns. On drop, Stimulus posts to `PUT /leads/:id { stage_id: ... }` and the controller broadcasts a Turbo Stream update so other open browsers update too.
4. Lead activity timeline: every action (note, email sent, stage change, form filled) creates a `LeadActivity` row. Render reverse-chronologically.
5. Convert lead → client: button creates `Client` with metadata copied, sets `lead.converted_client_id`, archives the lead.
6. Follow the Rs4.5 pattern: `Leads::Move`, `Leads::Convert` service objects; `Api::V1::LeadsController` exposes the pipeline as JSON (including stage move). Scopes: `leads:read`, `leads:write`.

**Verification:**
- Drag a card across columns, refresh, position holds.
- Open the same Kanban in two tabs; drag in tab A, tab B updates within 200ms.
- Reorder stages, leads stay in their stages, position persists.

---

### Session Rs7 — Services / Offerings

**Goal:** Professionals define services they sell (sessions, packages, consultations) with prices. Used by booking, invoices, marketing.

**Tasks:**
1. Model: `Service` (name, description, price_cents, currency, duration_minutes, is_active, metadata jsonb).
2. CRUD UI under `/dashboard/services`.
3. Price displayed in professional's chosen currency (settings); use `money-rails` if you need multi-currency arithmetic later.
4. Soft delete (set `is_active=false`) rather than hard delete — keep historical references intact.
5. Follow the Rs4.5 pattern: `Services::*` service objects; `Api::V1::ServicesController` for read/write. Scopes: `services:read`, `services:write`.

**Verification:** Create, edit, deactivate a service. Confirm it appears/disappears in booking widget (Rs8) and invoice line items (Rs12).

---

### Session Rs8 — Calendar, Appointments, iCal

**Goal:** Calendar UI, configurable availability, appointment CRUD, iCal feed for external calendar sync, optional Google Calendar OAuth two-way sync.

**Tasks:**
1. Models: `AvailabilitySlot` (day_of_week, start_time, end_time, recurring), `Appointment` (professional, client, service, start_at, end_at, status, location, type, notes).
2. Calendar view (month/week/day) — use FullCalendar via Stimulus controller, OR build a simpler one with ViewComponents. Prefer the latter for stability.
3. Appointment creation form: pick client, pick service (auto-fills duration), pick start time, system computes end_at, validates against availability + existing appointments.
4. Reminders: `appointment.send_reminder` job (SolidQueue) scheduled at appointment.start_at - 24h and -1h. Sends via ActionMailer + a notification.
5. iCal feed: `GET /calendar/:professional_token.ics` returns an `Icalendar::Calendar` rendering of upcoming appointments. Token is per-professional, secret, regeneratable.
6. (Optional, can defer) Google Calendar OAuth via `google-apis-calendar_v3`. Two-way sync: on save, upsert to Google; webhook on Google changes, update local. **Skip for nucleus; add when a vertical needs it.**
7. Follow the Rs4.5 pattern: `Appointments::Create`, `Appointments::Reschedule`, `Appointments::Cancel` service objects; `Api::V1::AppointmentsController` for full CRUD with overlap-conflict 422s surfaced in the error envelope. Scopes: `appointments:read`, `appointments:write`.

**Verification:**
- Subscribe to the iCal feed in Apple Calendar; appointments appear within 5 minutes.
- 24h reminder sends an email and creates a notification.
- Cannot double-book: creating a conflicting appointment shows a clear error.

---

### Session Rs9 — Real-Time Messaging (Production)

**Goal:** Production-quality messaging: attachments, read receipts, typing indicators, broadcast messages, message templates.

**Tasks:**
1. Migrate spike's `Conversation`/`Message` models into the production app. Add: `read_at`, `delivered_at`, `attachment` (ActiveStorage), `template_id` (optional).
2. Read receipts: Stimulus controller fires `mark_as_read` when message scrolls into view. Server updates `read_at` and broadcasts.
3. Typing indicator: ephemeral Action Cable broadcast (no DB write). Cleared after 3s idle.
4. Attachments: drag-drop or paste an image; ActiveStorage uploads to Supabase Storage (S3-compat). Thumbnail generated via `image_processing`.
5. Quick-reply templates: per-organization library of canned responses, inserted into the input via `<details>` dropdown.
6. Broadcast messages: from the dashboard, send one message to all clients matching a Ransack query. Background job creates one message per conversation (or one new conversation per client if none exists).
7. Follow the Rs4.5 pattern: `Messages::Create`, `Conversations::MarkRead` service objects (the spike's `Messages::Create` from Rs4.5 graduates here); `Api::V1::ConversationsController` and `Api::V1::MessagesController` expose list/send/mark-read as JSON. Scopes: `messages:read`, `messages:write`. Critical for AI agents — most AI use cases involve reading/writing messages.

**Verification:**
- Two browsers, send 10 messages, all appear in real time, all persist.
- Upload a 5MB image, thumbnail renders in chat, full image opens in lightbox.
- Broadcast to 100 clients completes in <30s, all conversations get the message.

---

### Session Rs10 — Forms Builder (Drag-Drop)

**Goal:** Drag-drop form builder. Form schema stored as JSON. Form rendering on portal/micro-site. Response storage with per-field analytics.

**Tasks:**
1. Models: `Form` (organization, title, description, schema jsonb, is_template, is_active), `FormAssignment` (form, client, status), `FormResponse` (form, client, answers jsonb).
2. Field types: text (short/long), single/multi select, slider, date, file upload, signature.
3. Builder UI: Sortable.js field reorder, click-to-edit field properties (label, required, options). Schema serializes to JSON.
4. Renderer: ViewComponent that takes a `Form` schema and emits a Simple Form-styled form. Rate-limited submission via `rack-attack`.
5. Pre-built templates seeded: Intake, GDPR consent, NPS, Feedback. Each is an `is_template=true` row in the `forms` table.
6. Response analytics: per-field, response count + (for select fields) distribution chart.
7. Follow the Rs4.5 pattern: `Forms::*` and `FormResponses::Submit` service objects; `Api::V1::FormsController` and `Api::V1::FormResponsesController` for list/read/submit. Scopes: `forms:read`, `forms:write`, `form_responses:read`, `form_responses:write`.

**Verification:**
- Build a 10-field form in <5 minutes via drag-drop.
- Send to a client, they fill it on the portal, response appears in dashboard with all answers.
- Spam-submit the public form 100x — rack-attack blocks at the configured threshold.

---

## Phase 3 — Documents & Files (Rs11–Rs12)

### Session Rs11 — Document Storage (ActiveStorage on Supabase)

**Goal:** Documents uploaded by professional or client, stored in Supabase Storage via S3-compat, with signed URLs, virus scan stub, and per-document ACL.

**Tasks:**
1. Configure ActiveStorage `:supabase` service in `config/storage.yml`:
   ```yaml
   supabase:
     service: S3
     access_key_id: <%= ENV["SUPABASE_S3_ACCESS_KEY"] %>
     secret_access_key: <%= ENV["SUPABASE_S3_SECRET"] %>
     region: <%= ENV["SUPABASE_REGION"] %>
     bucket: documents
     endpoint: <%= ENV["SUPABASE_S3_ENDPOINT"] %>  # https://xxx.supabase.co/storage/v1/s3
     force_path_style: true
   ```
2. Model: `Document` (uploaded_by_clerk_id, conversation_id?, client_id?, kind, name, file ActiveStorage attachment).
3. Signed URLs only — never expose direct bucket URLs. URL TTL 60 minutes.
4. Per-document Pundit policy: professional can read all org docs; client can read only docs explicitly shared with them.
5. Virus scan: stub a `DocumentScanJob` that runs ClamAV in the future. For now, log to Sentry if file >50MB or has executable extension.
6. Categories: a small enum (`contract`, `id_proof`, `medical`, `marketing`, `other`).

**Verification:**
- Upload 10MB PDF, signed URL works, expires in 60min.
- Client A cannot access Client B's documents (try the URL — RLS + Pundit double-block).
- Bulk download: zip multiple documents on the fly via `rubyzip`.

---

### Session Rs12 — PDF Generation (Invoices + Reports)

**Goal:** Two PDF paths: Prawn for data-heavy invoices, ChromicPDF for branded HTML reports.

**Tasks:**
1. `Invoice` model: number, client, professional, line items (services × qty × unit_price), subtotal, tax, total, status, due_date, issued_at.
2. `InvoicesController#show.pdf` renders Prawn document. Romanian invoice format compliance: VAT, CUI, sequential numbering per organization.
3. Reports: `ReportsController#weekly_activity.pdf` renders an ERB template through ChromicPDF. Branded with org colors/logo.
4. Background job: monthly invoice generation, weekly activity reports — created automatically and emailed to recipient via Resend.
5. Sequential invoice numbering: row-locked per organization to avoid gaps. Use `with_advisory_lock` gem if needed.

**Verification:**
- Generate 100 invoices in parallel; numbering has no gaps and no duplicates.
- Branded report PDF looks identical to its HTML preview at `/reports/weekly_activity.html`.

---

## Phase 4 — Subscriptions & Billing (Rs13–Rs14)

### Session Rs13 — Subscriptions (Pay Gem Production)

**Goal:** Production Stripe integration: checkout, customer portal, plan changes, webhook resilience, invoice retrieval, dunning.

**Tasks:**
1. Pay gem fully wired (already done in spike — extend it).
2. `BillingsController` actions: `show` (current plan + usage), `checkout` (start subscription), `portal` (open Stripe Customer Portal), `cancel` (cancel at period end).
3. Plan change handling: upgrade prorates immediately; downgrade applies at period end.
4. Webhook resilience: Pay handles signature verification. Wrap webhook processing in a `WebhookEvent` model that records every event ID — idempotent re-processing if Stripe retries.
5. Dunning: SolidQueue job `BillingDunningJob` runs daily, finds past_due subscriptions, emails the professional, marks account `restricted` after 7 days.
6. Receipt PDF (Pay supports this via the `receipts` gem).

**Verification:**
- Subscribe → upgrade → downgrade → cancel — all four paths work, DB stays consistent with Stripe (verify via Stripe CLI dashboard).
- Webhook delivered twice (manual replay) — only one DB update happens.
- Past-due account is restricted after 7 days; restoring payment re-enables.

---

### Session Rs14 — Plan Gating & Limits

**Goal:** Enforce per-plan limits (clients, storage, features) cleanly, with clear upgrade prompts.

**Tasks:**
1. `PLANS` config (from spike) becomes a `lib/plans.rb` module with a `Plans.limit_for(plan, key)` method.
2. Pundit policies check plan limits as part of `create?` for each gated resource:
   ```ruby
   class ClientPolicy < ApplicationPolicy
     def create?
       organization.clients.count < Plans.limit_for(organization.plan, :max_clients)
     end
   end
   ```
3. Feature flags via `Plans.has_feature?(plan, :marketing_kit)`. Wrap whole controllers/views with `before_action :require_feature!(:marketing_kit)`.
4. UI: every gated action shows upgrade CTA if blocked. Don't hide the menu item — show it disabled with a tooltip "Available on Growth plan".
5. Storage limit: track `total_storage_bytes` on `Organization`, enforced on every ActiveStorage upload via custom validator.

**Verification:**
- Hit each limit (clients, storage, gated feature) — UX is clear and consistent.
- Upgrading immediately raises the limit (no manual intervention).
- Downgrading + exceeding the new limit shows a "you're over by N" warning but doesn't delete data.

---

## Phase 5 — Marketing Kit (Rs15–Rs17)

### Session Rs15 — Email Campaigns

**Goal:** Compose, preview, schedule, send email campaigns to client segments. Track opens/clicks via Resend webhooks.

**Tasks:**
1. Models: `Campaign` (name, subject, body_mjml, audience_query, scheduled_at, sent_at, stats jsonb), `CampaignDelivery` (campaign, client, sent_at, opened_at, clicked_at).
2. Editor: MJML in a textarea (later, swap for a proper builder). Real-time preview via Turbo Stream (`oninput` debounced post → server renders → returns iframe content).
3. Audience: Ransack query stored as JSON, e.g. `{ "tags_id_in": [1, 2], "status_eq": "active" }`. Preview count before send.
4. Send: SolidQueue job iterates audience in batches of 100, calls `Resend::Emails.send` per recipient. Idempotent via `CampaignDelivery` row check.
5. Resend webhooks → `webhooks/resend` endpoint → updates `CampaignDelivery.opened_at` / `clicked_at`.
6. Stats dashboard: open rate, click rate, unsubscribe rate per campaign.

**Verification:**
- Campaign to 500 clients sends in <2 minutes.
- Open rate updates within 5 minutes of recipient opening.
- Re-running the same campaign doesn't double-send (idempotency holds).

---

### Session Rs16 — Social Media Templates

**Goal:** Templated social images (Instagram post, story, Facebook). Professional fills text, image, color, exports PNG.

**Tasks:**
1. Models: `SocialTemplate` (system-seeded — categories: motivational, promo, testimonial, listing), `SocialAsset` (rendered version, owned by professional).
2. Templates are HTML/CSS designs — stored as ERB views.
3. Form: editable text fields, color pickers, image upload.
4. Render: ChromicPDF with `chromic_pdf.print_to_pdf` for PDF, or use Chromic's `screenshot` mode for PNG export.
5. Download or share via direct URL.

**Verification:**
- Pick template, fill fields, download PNG. Image renders correctly at 1080×1080 (Instagram square).
- Twenty templates seeded; each renders without errors.

---

### Session Rs17 — Lead Magnets & Landing Pages

**Goal:** Standalone landing pages with form gating. Visitor fills form → receives lead magnet PDF → becomes a Lead in pipeline.

**Tasks:**
1. Models: `LeadMagnet` (title, description, file ActiveStorage, landing_page_template, slug).
2. Public route: `GET /lp/:slug` renders landing page; `POST /lp/:slug` accepts form, creates Lead, emails the magnet PDF.
3. Built-in templates: 3 styles (minimalist, vibrant, professional). Customize via brand colors from organization settings.
4. UTM tracking: parse `utm_source`, `utm_campaign` from URL, store on Lead's metadata.
5. Conversion analytics: views (via Ahoy), submissions, conversion rate.

**Verification:**
- Public landing page loads in <500ms (full SSR, no JS required).
- Submit form → email arrives within 30s → Lead appears in pipeline tagged with magnet name.

---

## Phase 6 — Automation (Rs18–Rs19)

### Session Rs18 — Workflow Engine

**Goal:** Declarative trigger → action automation. Triggers fire from app events; actions run as SolidQueue jobs. Branching with delays.

**Tasks:**
1. Models: `Workflow` (organization, name, trigger_type, trigger_config jsonb, is_active), `WorkflowAction` (workflow, position, action_type, action_config, delay_seconds), `WorkflowRun` (workflow, subject_type, subject_id, started_at, completed_at, current_step).
2. Triggers (initial set):
   - `client.created`
   - `lead.stage_changed`
   - `appointment.completed`
   - `form.submitted`
   - `client.inactive_for_days`
3. Actions (initial set):
   - `send_email` (template + recipient)
   - `send_notification`
   - `add_tag`
   - `remove_tag`
   - `assign_form`
   - `create_task`
   - `wait` (delay only — internal step type)
4. Trigger dispatch: `ActiveSupport::Notifications.instrument("client.created")` emits an event; `WorkflowDispatcher` looks up matching workflows and enqueues runs.
5. Run engine: `WorkflowRunStepJob` advances one step, schedules itself for the next step (with `wait_until` for delays). Idempotent.
6. Builder UI: visual stepper, drag-drop actions, configure each. Stimulus + Turbo.

**Verification:**
- Workflow "new client → wait 1 day → send welcome email" — full path runs end-to-end.
- Workflow with 5 steps including a 7-day wait — all steps fire on schedule.
- Disabling a workflow stops new runs but lets in-flight runs complete.

---

### Session Rs19 — Notifications (Multi-Channel)

**Goal:** Unified notification system: in-app, email, web push. User-configurable per-channel.

**Tasks:**
1. Use `noticed` gem 2.6+. Define notification classes: `NewMessageNotification`, `AppointmentReminderNotification`, `LeadNewNotification`, etc.
2. Each notification declares delivery methods: database (in-app), email (ActionMailer), web_push (web-push gem).
3. User preferences UI: per notification class × channel = on/off matrix. Stored on `User` (or `Professional`/`Client`).
4. In-app notification dropdown: Turbo Stream broadcasts new notifications, badge counter updates live.
5. Web push: register service worker (if PWA), store subscription on `WebPushSubscription` model, send via `web-push` gem.
6. Quiet hours: per-user setting, skips email/push between configured hours.

**Verification:**
- Send a test notification → appears in dropdown immediately, email arrives, web push pops up.
- Disable email channel for one notification type → only in-app + push fire.
- Quiet hours: schedule a notification at 2am → fires in DB, deferred email until morning.

---

## Phase 7 — Public Micro-Site (Rs20–Rs21)

### Session Rs20 — Micro-Site Shell

**Goal:** Public-facing site at `app.com/<slug>` (or custom domain) with themes, sections, professional branding.

**Tasks:**
1. Add `slug` to `Organization`. Public routes: `/:slug`, `/:slug/services`, `/:slug/about`, `/:slug/contact`.
2. Constraint route to slugs that exist: `constraints SlugConstraint do ... end`.
3. `MicroSitesController#show` looks up org by slug, sets it as the **public read-only tenant context**, renders the homepage with org branding.
4. Themes: 3 to start (minimalist, professional, vibrant). Each is a layout file. Org picks via settings.
5. Sections (composable): `HeroSection`, `ServicesSection`, `TestimonialsSection`, `AboutSection`, `ContactSection`. Each is a ViewComponent with editable content stored on `Organization` (or a `MicroSiteContent` row).
6. Custom domain: `Organization.custom_domain` field. Add a Rack middleware that maps `request.host` → org slug if a custom domain matches. SSL handled by Caddy auto-cert.

**Verification:**
- Visit `/<slug>` — page renders with org branding, no auth required.
- Switch theme — site instantly looks different.
- Add custom domain in settings, point DNS, Caddy issues SSL automatically.

---

### Session Rs21 — Contact Forms, SEO, Analytics

**Goal:** Lead capture from micro-site, structured data for SEO, traffic analytics.

**Tasks:**
1. Contact form: rendered via Rs10 form renderer. Submission creates a `Lead` in the pipeline.
2. Honeypot + rack-attack to deter spam.
3. SEO: per-page `<title>`, `<meta description>`, `<link rel="canonical">`. Schema.org markup for `Organization` and (in verticals) `RealEstateListing` / `LocalBusiness`.
4. Sitemap.xml at `/<slug>/sitemap.xml` listing all public pages.
5. Robots.txt: per-organization (allow if subscribed, disallow if free trial).
6. Ahoy_matey tracks visits per micro-site. Dashboard shows visits, top sources, conversion rate (visits → leads).

**Verification:**
- Lighthouse SEO score >95 on a published micro-site.
- Submit contact form → Lead appears, spam attempts blocked.
- Visit dashboard analytics → see real visitor data.

---

## Phase 8 — Client Portal (Rs22–Rs23)

### Session Rs22 — Portal Shell & Auth

**Goal:** Branded portal at `/portal` for clients. Same Clerk auth, different role/UI. One client may belong to multiple professionals (e.g., trainer + nutritionist).

**Tasks:**
1. Add `Client.clerk_user_id` (was previously professional-side-only).
2. New layout `portal.html.erb` — branded with the *current* professional's colors. If client has multiple professionals, show a switcher.
3. `PortalController` namespace: all controllers under `app/controllers/portal/`. Each `before_action :ensure_client_role!`.
4. Routes: `/portal`, `/portal/messages`, `/portal/documents`, `/portal/forms`, `/portal/appointments`.
5. Pundit `ClientPortalPolicy` — restrictive by default. Clients can read their own messages/docs/forms, write only via explicit endpoints.

**Verification:**
- Sign in as a client → land on `/portal`, see branded UI.
- Cannot access `/dashboard` or any professional-side route.
- Switch professional context (if multi) → UI rebrands.

---

### Session Rs23 — Portal Features

**Goal:** Client uses the portal: read messages, fill assigned forms, upload requested documents, view appointments, see "progress" (generic — verticals extend).

**Tasks:**
1. `Portal::MessagesController` — same Hotwire chat from Rs9, scoped to client's conversations.
2. `Portal::FormsController` — list assigned forms, fill, submit. Use the renderer from Rs10.
3. `Portal::DocumentsController` — list shared docs, upload requested ones, download. Use the storage from Rs11.
4. `Portal::AppointmentsController` — list upcoming + past, cancel (within policy), reschedule (open availability widget from Rs8).
5. Generic "progress" page (`Portal::ProgressController`) — placeholder ViewComponent. Verticals override (Fit shows weight chart, Estate shows transaction stage).
6. Notifications: clients receive their own preferences UI, opt in/out per channel.

**Verification:**
- Full client journey: invited → onboarded → message + fill form + upload doc + reschedule appointment — all from portal.
- A professional's data never leaks: client cannot see other clients of the same professional.

---

## Phase 9 — Production Readiness (Rs24–Rs26)

### Session Rs24 — i18n & Time Zones

**Goal:** Romanian + English everywhere. Time zone display per user.

**Tasks:**
1. `config/application.rb`: `config.i18n.default_locale = :ro`, `config.i18n.available_locales = [:ro, :en]`.
2. Translation files: `config/locales/ro.yml`, `config/locales/en.yml`. Use `i18n-tasks` gem to find missing keys + dead keys.
3. Locale detection: `Accept-Language` header, override via `?locale=` param, persist to user preference.
4. Time zones: `User.timezone` field, default `Europe/Bucharest`. `Time.use_zone(current_user.timezone)` wrapper in `ApplicationController`.
5. Currency: per-organization, displayed via `humanized_money_with_symbol`.
6. Date formats: Romanian uses `dd.mm.yyyy`, English uses `mm/dd/yyyy` — handle via `I18n.l(date, format: :short)`.

**Verification:**
- `i18n-tasks health` — 0 missing, 0 unused.
- Switch locale — every visible string changes.
- Schedule appointment in Bucharest, view as user in Berlin → time shifts correctly.

---

### Session Rs25 — GDPR & Security Hardening

**Goal:** GDPR endpoints (export, delete, consent), security headers, rate limiting on every public endpoint, brakeman clean.

**Tasks:**
1. Consent: `ConsentsController` records GDPR + marketing consent. Surface in onboarding.
2. Data export: `GdprController#export` enqueues `GdprExportJob` that bundles all user data into a ZIP (JSON + attachments), emails a signed download link.
3. Account deletion: `GdprController#delete` — confirmation flow, anonymizes audit logs, hard-deletes everything else, cancels Stripe subscription.
4. Security headers via `secure_headers` gem: CSP, HSTS, X-Frame-Options, Referrer-Policy.
5. `rack-attack` rules:
   - Auth endpoints: 10/min/IP
   - Public form submissions: 5/min/IP
   - Webhook endpoints: 100/min/IP (Stripe/Clerk)
6. `brakeman -A` runs in CI, must be clean.
7. Bundler-audit + npm audit (if any JS deps) in CI.

**Verification:**
- Export your account → ZIP arrives within 5 minutes, contains everything.
- Delete account → all rows gone except anonymized audit log entries; Stripe subscription cancelled; cannot sign in anymore.
- `brakeman` exits 0; CSP doesn't break any page.

---

### Session Rs26 — Observability

**Goal:** Sentry catches errors, Ahoy tracks usage, optional PostHog for product analytics + flags. SLO dashboard.

**Tasks:**
1. `sentry-rails` configured. Capture context: `current_professional.id`, `current_organization.id`, request_id.
2. `ahoy_matey` tracks visits + custom events (`Ahoy.track "client_created"`).
3. Optional PostHog: `posthog-ruby` gem for server-side events; `posthog-js` for client-side feature flags. Skip if Ahoy is enough.
4. Health check endpoint: `/up` (Rails 8 default) extended to include DB ping, Redis ping (if used), SolidQueue worker status.
5. Logs: structured (lograge), shipped to Logflare or local file with `logrotate`.
6. SLO dashboard (simple): a controller that surfaces last 7d uptime, error rate, P95 latency from Ahoy + Sentry data.

**Verification:**
- Trigger an error in dev → appears in Sentry within 30s with full context.
- Track an event → appears in Ahoy dashboard.
- `/up` returns 200 with structured JSON when healthy, non-200 when DB unreachable.

---

### Session Rs26.5 — OpenAPI Spec + MCP Server

**Goal:** Make the API discoverable to AI agents two ways: a published OpenAPI 3.1 spec for any agent that consumes tool specs, and a native MCP endpoint for MCP-aware clients (Claude Desktop, Claude Code, Anthropic SDK tool use). One auth model, two transports, same service objects.

**Tasks:**
1. Add `rswag-specs` (or `oas_rails`). Every Rs4.5+ request spec gets a spec block; running the test suite regenerates `openapi.yaml`. CI fails if the spec is out of date.
2. Publish at `/api/v1/openapi.yaml` and `/api/v1/openapi.json`, version-pinned. Lint with `spectral` in CI.
3. Mount a developer console at `/api/docs` (Scalar or Stoplight Elements) behind dashboard auth — professionals try their own endpoints with their own token, no copy-paste curl.
4. Add `fast-mcp` gem. Mount MCP server at `/mcp` (HTTP+SSE transport, with HTTP fallback for proxies that buffer SSE).
5. Register MCP tools as thin wrappers over Rs4.5 service objects: `list_clients`, `find_client`, `create_appointment`, `reschedule_appointment`, `send_message`, `list_conversations`, `get_pipeline_stage`. Tool JSON schemas derive from the service object's parameter contract — no separate definition.
6. MCP authentication uses the same `PersonalAccessToken` from Rs4.5. Tool calls run through Pundit and `with_tenant_setting`. An MCP token cannot escape its tenant or its scopes.
7. Add an "AI Access" panel to the dashboard: shows the MCP URL, generates a scoped token, copy-paste config snippets for Claude Desktop and Claude Code, with a one-page explainer aimed at non-technical professionals.
8. Worked example in `docs/mcp-example.md`: a Claude conversation using the MCP server to triage new leads ("show me leads added this week with no follow-up, draft a message to each"). Use this as the demo for niche-vertical hand-off (Rs28).
9. Tool descriptions reviewed as product copy. Each tool gets: a one-sentence purpose, a "when to use" line, and an example. Vague descriptions = agents misuse the tool.

**Verification:**
- `curl /api/v1/openapi.yaml` returns a spec; `spectral lint` passes with zero errors.
- A throwaway TypeScript client generated via `openapi-typescript-codegen` compiles, authenticates, and round-trips a `GET /api/v1/clients`.
- Claude Desktop configured with the generated token connects to `/mcp`, lists tools, and `list_clients` returns only the token's tenant.
- An MCP token scoped `clients:read` fails `create_appointment` with a 403 captured in the MCP error frame.
- `bin/rails test test/integration/mcp_*` covers tool discovery, tenant isolation, scope enforcement, and SSE stream stability.

**Risks to watch:**
- MCP transport spec is still moving. Pin `fast-mcp`, budget one breaking-change upgrade per year, and keep tool registration in one file to make migrations cheap.
- SSE through Kamal + Caddy: confirm the proxy does not buffer the stream before deploying. Add a smoke test that opens a streamed tool call against production.
- Webhook **emitters** (so external agents can subscribe to "new lead", "new message") are NOT in this session — they're a meaningful additional surface. Decide separately whether Nucleus needs them or if polling the API is enough for now.

---

## Phase 10 — Deploy & Hand-Off (Rs27–Rs28)

### Session Rs27 — Production Deployment (Kamal on Hetzner)

**Goal:** One-command deploy to a Hetzner CX22 (€5/month), zero-downtime, automatic SSL via Caddy.

**Tasks:**
1. Provision Hetzner CX22 (2 vCPU, 4GB RAM, Ubuntu 24.04). Add SSH key.
2. `kamal init`. Configure `config/deploy.yml`:
   - Docker image registry (Docker Hub or GHCR)
   - Web role: 2 containers
   - Worker role: 1 container running SolidQueue
   - Caddy as accessory for SSL + reverse proxy
3. Secrets: pull from `.env.production` (gitignored), Kamal injects at deploy.
4. Database: stay on Supabase (managed, backed up). Storage: Supabase Storage. No local Postgres on the VPS.
5. `bin/kamal deploy` — first deploy takes ~10 min, subsequent are <2 min with rolling restart.
6. CI/CD: GitHub Actions workflow runs tests → on green merge to main, runs `kamal deploy`.
7. Monitoring: UptimeRobot pings `/up` every 5min, Sentry captures errors.

**Verification:**
- Push to main → green CI → auto-deploy → site updated within 5 minutes, no downtime.
- Roll back: `kamal rollback` reverts in <30s.
- Add an env var in `.env.production` → `kamal env push && kamal deploy` — picks up.

---

### Session Rs28 — Niche Extension Seams & Hand-Off

**Goal:** Lock in *how* a vertical (EstateCore, FitCore) extends the nucleus. Document patterns. Create a "vertical starter" template.

**Tasks:**
1. Each vertical lives in its own Rails engine: `engines/estate_core/`, `engines/fit_core/`. Mounted in routes.
2. Engines depend on the core but cannot be required twice — only one mounted in any given environment via env var `ACTIVE_VERTICAL=estate_core`.
3. Extension seams documented:
   - **New tables**: engine migrations, scoped to engine name to avoid collisions.
   - **Add columns to core tables**: forbidden. Use a separate `client_real_estate_profile` table joined by client_id.
   - **Override views**: engine partials placed at `app/views/<core_path>` override core views (Rails default lookup behavior).
   - **Override controllers**: engine includes a concern via `Rails.application.config.to_prepare`.
   - **Add nav items**: each engine registers via a `VerticalRegistry` initializer.
   - **i18n**: engine has its own `config/locales/`.
   - **Pundit**: engine adds policies.
   - **Background jobs**: engine adds jobs in `engines/<name>/app/jobs/`.
4. Hand-off doc `VERTICAL-EXTENSION-GUIDE.md`: every category above with a worked example.
5. Generator: `rails g vertical estate_core` scaffolds an engine with the right structure.
6. Engine resources inherit the API contract: any model an engine adds gets a service object + `Api::V1::<Engine>::*` controller + MCP tool registration for free by inheriting the Rs4.5 base classes and calling `register_mcp_tool` in the engine's initializer. A vertical's data is reachable via REST and MCP without per-vertical plumbing.

**Verification:**
- Generate a `demo_vertical` engine, mount it, restart server, see "Demo Vertical" tab in nav.
- Add a model to demo vertical, migrate, use it via the dashboard — works without touching core.
- The same model is reachable at `/api/v1/demo_vertical/<resources>` and as an MCP tool, scoped to the active vertical.

---

# Cross-Cutting Concerns (Apply Everywhere)

## Testing Strategy

| Layer | Tool | When |
|---|---|---|
| Models | RSpec model specs | Every model, every method with logic |
| Pundit | Policy specs | Every policy, every action |
| Controllers | Request specs | Every controller, happy + sad path |
| System | Capybara + Cuprite | Every user-facing flow, end-to-end |
| Background jobs | Job specs | Every job, idempotency verified |
| Webhooks | Request specs with VCR | Every webhook endpoint, signature + idempotency |

**Coverage target:** 85% line, 100% on Pundit policies and webhook endpoints. SimpleCov in CI.

## Security Checklist (Each Session)

- [ ] Brakeman clean
- [ ] No raw SQL with interpolation (use bind params)
- [ ] Strong params on every controller
- [ ] Pundit policy on every controller action (default-deny)
- [ ] CSRF on every browser-facing POST/PUT/DELETE
- [ ] Rate limit on every public endpoint
- [ ] Audit log on every state-changing action
- [ ] No `current_user.id` from client-controllable params

## Performance Budgets

- P95 page load: <500ms (Rails server-rendered, no SPA hydration)
- P95 API endpoint: <200ms
- Background job startup: <5s
- Image upload (5MB): <3s end-to-end

Use `rack-mini-profiler` in dev. `bullet` catches N+1 in dev. Skylight or AppSignal in production (optional).

## Naming Conventions

- Tables: snake_case plural (`clients`, `lead_stages`).
- Models: PascalCase singular (`Client`, `LeadStage`).
- Controllers: `<Resources>Controller` (`ClientsController`).
- Concerns: in `concerns/` folder, named with `able` or `_concern` suffix.
- ViewComponents: `<Name>Component`, in `app/components/`.
- Jobs: `<Verb><Noun>Job` (`SendCampaignJob`).
- Policies: `<Resource>Policy`.
- I18n keys: dot-namespaced by view (`clients.index.title`).

---

# What This Plan Does NOT Cover

These are explicitly out of scope for the nucleus. Verticals or future plans handle them:

- **Native mobile apps**: PWA via Hotwire Native if/when needed; no React Native.
- **AI features**: Anthropic Claude integration via `ruby-anthropic` gem, added per-vertical (S43 in each delta plan).
- **Vertical-specific data models**: Properties, Programs, Workouts, Meal Plans — these go in vertical engines.
- **Vertical-specific portal sections**: Buyer shortlist, transformation gallery — vertical engines.
- **Marketplaces, payment splits, escrow**: out of scope.
- **Real-time collaborative editing**: not needed.

---

# Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Clerk Ruby SDK has bugs/gaps | Medium | High | Spike Day 2 catches this early. Fallback: implement Clerk Backend API directly via Faraday — adds ~200 LOC. |
| Supabase Postgres connection pooling clashes with `SET LOCAL` | Medium | Medium | Use session-mode pooler. Verified in Spike Day 1. |
| ActionCable doesn't scale to 10k+ concurrent | Low | Medium | Solid Cable handles low thousands; if you outgrow, swap to AnyCable (drop-in Go server). Not needed for years. |
| Pay gem breaks on Stripe API change | Low | High | Pay is widely used + actively maintained. Pin version, follow upgrade guide on bumps. |
| Rails 8 has a major bug | Very Low | High | Rails has 20-year track record of stability. Pin patch version. |
| Founder's Ruby ramp-up takes longer than 4 weeks | Medium | Medium | Claude does the writing; founder does the reading. Reading Ruby is fast. |
| Vertical engines turn out hard to compose | Medium | Medium | Pattern is well-trodden (Refinery CMS, Spree Commerce — both engine-based). Worst case: monorepo with namespaced modules instead of engines, also fine. |
| Public API surface invites abuse (scraping, brute force, accidental over-fetching by misconfigured agents) | Medium | Medium | Per-token rate limiting (Rs4.5), required scopes per endpoint, audit log entries on every state change (Rs3), tenant isolation enforced via RLS (BYPASSRLS gotcha addressed in Rs4.5 token auth), 404-on-cross-tenant prevents enumeration. |
| `fast-mcp` gem or MCP transport spec churns | Medium | Low | Pin gem version, isolate MCP tool registration in one file, budget one breaking-change upgrade per year. REST surface is unaffected by MCP churn. |

---

# Total Effort Estimate

- **Spike**: 2 weeks × 4 hours/day × 5 days = 40 hours
- **Part B (30 sessions)**: 30 × 3 hours avg = 90 hours (Rs4.5 + Rs26.5 added; the per-resource API hint inside Rs5–Rs10 adds ~30 min each, absorbed in the per-session average)
- **Buffer for debugging, iteration, polish**: ~30%
- **Total**: ~170 hours = ~10–11 weeks at 16 hours/week part-time, or 4–5 weeks at 40 hours/week full-time.

Compare to the Next.js path: 25 sessions done + 20 remaining for nucleus completion + ongoing fire-fighting. Similar total effort, but at the end you have a stack you trust *and* a first-class API surface for AI agents.

---

# Document History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-04-23 | Narcis | Initial plan post Next.js → Rails decision |
| 1.1 | 2026-04-24 | Narcis | Added Rs4.5 (API foundation: service objects + JSON API + PAT auth) and Rs26.5 (OpenAPI spec + MCP server). Rs5–Rs10 each gain a service-object/JSON controller task. Rs28 picks up engine-level API + MCP inheritance. Rationale: enable first-class AI-agent access to Nucleus data without spinning up a separate TS service against the same DB. |

— *END OF DOCUMENT* —
