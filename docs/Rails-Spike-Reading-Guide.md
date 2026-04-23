# Rails Spike — Reading Guide for a TypeScript Developer

A walk-through of `nucleus-rails-spike/` for someone coming from the TypeScript/Node ecosystem (Next.js, Express, Nest, etc.). The goal is to make the codebase reviewable, not to teach Rails top-to-bottom.

The spike was built over 5 days and proves out: DB + scaffolding (Day 1), Clerk auth (Day 2), multi-tenancy with Postgres RLS (Day 3), real-time messaging via ActionCable (Day 4), Stripe subscriptions via the Pay gem + plan gating (Day 5).

---

## Table of contents

1. [Ruby syntax crash-course for TypeScript devs](#1-ruby-syntax-crash-course-for-typescript-devs)
2. [Rails mental model](#2-rails-mental-model)
3. [Directory map — where things live](#3-directory-map--where-things-live)
4. [Request lifecycle — following one HTTP call end to end](#4-request-lifecycle--following-one-http-call-end-to-end)
5. [The domain model in this spike](#5-the-domain-model-in-this-spike)
6. [Auth (Clerk)](#6-auth-clerk)
7. [Multi-tenancy — two layers of defense](#7-multi-tenancy--two-layers-of-defense)
8. [Real-time messaging (ActionCable + Turbo Streams)](#8-real-time-messaging-actioncable--turbo-streams)
9. [Billing (Pay gem + Stripe)](#9-billing-pay-gem--stripe)
10. [How to read a controller / view / model quickly](#10-how-to-read-a-controller--view--model-quickly)
11. [TypeScript → Rails cheat-sheet](#11-typescript--rails-cheat-sheet)

---

## 1. Ruby syntax crash-course for TypeScript devs

You can read ~90% of this spike if you keep these rules in mind:

### 1.1 No braces, no semicolons, no `var`/`let`/`const`

```ruby
name = "Alice"          # variable
MAX = 10                # CONSTANT (uppercase — Ruby enforces this)
user.email              # property access (see 1.5 — it's actually a method call)
```

Blocks use `do ... end` or `{ ... }` (braces are for one-liners, `do`/`end` for multi-line):

```ruby
[1, 2, 3].each do |n|
  puts n
end
# equivalent to  [1, 2, 3].each { |n| puts n }
```

`|n|` declares the block argument — like `(n) =>` in JS arrow syntax.

### 1.2 Everything is an expression

The last expression in a method or block is the return value. Explicit `return` is rare.

```ruby
def greet(name)
  "Hello, #{name}"        # implicit return
end
```

`#{...}` is string interpolation — Ruby's equivalent of JS backtick templates.

### 1.3 Parens on method calls are usually optional

These are the same call:

```ruby
user.update(name: "Alice")
user.update name: "Alice"
```

This is why Rails DSLs like `validates :email, presence: true` don't visibly look like function calls — **they are**. Mentally read `validates(:email, presence: true)`.

### 1.4 Symbols (`:foo`) vs strings (`"foo"`)

`:email` is a **symbol** — an immutable, interned identifier. Used everywhere as keys, method names, states. Think of it as TS enum-ish or `"email" as const`.

```ruby
{ name: "Alice", role: :admin }
# key `name:` is a symbol (:name), value "Alice" is a string
# value :admin is also a symbol
```

`name: "Alice"` (trailing-colon-in-hash) is shorthand for `:name => "Alice"`. Both syntaxes are live in the codebase.

### 1.5 Methods vs attributes — no distinction

```ruby
user.email              # calls the `email` method, which happens to return @email
user.email = "x@y.com"  # calls the `email=` method
```

In Rails models, ActiveRecord generates `email` / `email=` methods for every database column. You never write getters/setters manually.

### 1.6 Classes look familiar; modules ≈ mixins/namespaces

```ruby
class Client < ApplicationRecord    # inheritance
  validates :full_name, presence: true
end

module ClerkAuthenticatable         # like a TS namespace / mixin
  extend ActiveSupport::Concern
  included do
    helper_method :current_clerk_user
  end
end
```

`include SomeModule` mixes a module's methods into a class (TS has no direct equivalent — closest is applying multiple mixins manually).

### 1.7 `@foo` is an instance variable

```ruby
class ClientsController
  def index
    @clients = Client.all       # @clients is visible to the view template
  end
end
```

No declaration needed — assignment creates it. Views can read controller `@vars` directly.

### 1.8 Blocks, `yield`, `&block`

A block is an anonymous lambda passed implicitly to a method. `yield` calls it:

```ruby
def with_tenant_setting(id)
  # ... setup ...
  yield              # runs the block the caller passed
  # ... teardown ...
end

with_tenant_setting(123) do
  Client.create!(...)     # runs inside the yield
end
```

This is idiomatic Ruby for "do X, then my thing, then Y" — used in `ApplicationRecord.with_tenant_setting` to wrap DB calls in a transaction with the tenant GUC set.

### 1.9 `?` and `!` in method names are convention

- `empty?`, `active?` — return a boolean (like `isEmpty()` in TS)
- `save!`, `destroy!` — the "bang" version raises on failure (vs. `save` returning false)

These are just naming conventions, not special syntax.

### 1.10 Three small things that trip up newcomers

- `||=` means "assign if nil": `@x ||= expensive_call` is memoization.
- `&.` is the safe-navigation operator (same as TS `?.`).
- `%w[foo bar]` is `["foo", "bar"]` — a word array literal. `%i[foo bar]` is `[:foo, :bar]`.

---

## 2. Rails mental model

Rails is **convention-over-configuration MVC**. If Next.js is "a framework that hands you primitives and expects you to assemble them", Rails is "the framework makes the assembly decisions for you — here is where a controller lives, here is how you declare a route, here is how a DB column becomes a model attribute."

### The main pieces

| Rails concept | Closest TS/Node analogue |
|---|---|
| **Active Record** (`app/models/*.rb`) | ORM like Prisma/Drizzle, but models *inherit* from ActiveRecord — the class *is* the query builder and the row |
| **Action Controller** (`app/controllers/*.rb`) | Express/Hono route handlers, but grouped by resource |
| **Action View** (`app/views/**/*.erb`) | Server-rendered templates (ERB ≈ EJS/JSX-without-components) |
| **Action Cable** (`app/channels/`) | WebSocket server (Socket.IO / ws) |
| **Routes** (`config/routes.rb`) | Next.js file-based routing, but centralised in one DSL file |
| **Migrations** (`db/migrate/`) | Prisma migrations / Drizzle migrations |
| **Concerns** (`app/controllers/concerns/`, `app/models/concerns/`) | Mixins for sharing behaviour |
| **Initializers** (`config/initializers/`) | App boot-time setup (`server.ts` top-of-file config) |
| **Gems** (`Gemfile`) | `package.json` deps |

### The request lifecycle at a glance

```
HTTP request
  → Rack middleware stack (includes Clerk::Rack::Middleware)
  → Router (config/routes.rb) picks a controller#action
  → ApplicationController `before_action` hooks run (auth, set tenant, start RLS transaction)
  → Controller action runs (fills @ivars, usually calls render or redirect_to)
  → View template (.html.erb) renders with @ivars in scope
  → Response flows back out; the RLS transaction ends in an `around_action`
```

---

## 3. Directory map — where things live

```
nucleus-rails-spike/
├── app/
│   ├── controllers/                 HTTP request handlers
│   │   ├── application_controller.rb      Base class. Every other controller inherits from it.
│   │   ├── concerns/
│   │   │   └── clerk_authenticatable.rb   Mixin: current_clerk_user, current_professional, ...
│   │   ├── webhooks/
│   │   │   └── clerk_controller.rb        Clerk → Rails user sync (Svix-verified)
│   │   ├── clients_controller.rb          /clients CRUD (with subscription quota gate)
│   │   ├── conversations_controller.rb    /conversations index & show
│   │   ├── messages_controller.rb         POST /conversations/:id/messages  (real-time)
│   │   ├── billings_controller.rb         Stripe Checkout & portal redirects
│   │   ├── dashboard_controller.rb        / (root, after sign-in)
│   │   ├── notes_controller.rb            Scaffolded by Rails on Day 1 — reference only
│   │   └── sessions_controller.rb         /sign-in (renders Clerk sign-in component)
│   │
│   ├── models/                      Domain + DB. Every class ↔ one table.
│   │   ├── application_record.rb          Base class; defines with_tenant_setting (RLS helper)
│   │   ├── professional.rb                The tenant. Wraps a Clerk user. Pay customer.
│   │   ├── client.rb                      Belongs to one professional
│   │   ├── conversation.rb                Professional ↔ client pair
│   │   ├── message.rb                     Broadcasts via Turbo Streams on create
│   │   └── note.rb                        Day 1 scaffolding — not used in the product flow
│   │
│   ├── views/                       ERB templates (one folder per controller)
│   │   ├── layouts/application.html.erb   The HTML shell wrapping every page
│   │   ├── messages/_form.html.erb        Partials start with _ and are rendered by name
│   │   └── ...
│   │
│   ├── channels/
│   │   └── application_cable/connection.rb   WebSocket auth (reads Clerk from rack env)
│   │
│   ├── javascript/                  Stimulus controllers + importmap entry
│   └── jobs/                        Background jobs (none written yet for this spike)
│
├── config/
│   ├── application.rb               Rails app class (loads defaults 8.1)
│   ├── routes.rb                    THE routing file — read this first
│   ├── database.yml                 DB connection config (per env)
│   ├── environments/
│   │   ├── development.rb
│   │   ├── test.rb
│   │   └── production.rb
│   └── initializers/                Run once on boot
│       ├── pay.rb                         Pay gem config (Stripe enabled)
│       └── plans.rb                       Plans::CONFIG — starter/growth/pro price ids + limits
│
├── db/
│   ├── schema.rb                    Auto-generated snapshot of current DB structure
│   ├── migrate/                     Timestamped migrations (chronological)
│   │   ├── 20260423081653_create_clients.rb
│   │   ├── 20260423081721_enable_rls_on_clients.rb        ← raw SQL for Postgres RLS
│   │   ├── 20260423085619_create_messages.rb
│   │   ├── 20260423085642_enable_rls_on_messaging.rb
│   │   └── 20260423112926_create_pay_tables.pay.rb         ← installed from the Pay gem
│   └── seeds.rb                     Optional dev seed data
│
├── Gemfile / Gemfile.lock           Dependencies (like package.json / package-lock.json)
├── bin/                             Executables (bin/rails, bin/dev, bin/setup)
├── lib/                             Non-Rails-autoloaded code (tasks, rakefiles)
├── public/                          Static assets served as-is
├── storage/                         Active Storage uploads (local)
├── test/                            Minitest specs
├── log/ tmp/                        Not source — generated
└── Procfile.dev                     `bin/dev` reads this to start web + css watcher
```

**The three files to open first:**

1. `config/routes.rb` — the sitemap. Every URL maps to a `controller#action` here.
2. `app/controllers/application_controller.rb` — the request-lifecycle brain. Every HTTP request goes through its `before_action`/`around_action` hooks.
3. `app/models/application_record.rb` — contains `with_tenant_setting`, the RLS transaction wrapper.

---

## 4. Request lifecycle — following one HTTP call end to end

Let's trace `GET /clients` for a signed-in professional.

### Step 1 — routes.rb picks the handler

```ruby
# config/routes.rb
resources :clients, only: [:index, :new, :create, :show]
```

`resources :clients` is a macro that creates a standard set of RESTful routes. The `only:` filter keeps just four. `index` maps `GET /clients → ClientsController#index`.

### Step 2 — Rack middleware runs

`Clerk::Rack::Middleware` (injected via the `clerk-sdk-ruby` gem) parses the Clerk session cookie/JWT and stuffs a `Clerk::Proxy` into `request.env["clerk"]`. This happens **before** the controller runs.

### Step 3 — ApplicationController `before_action` hooks fire

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  include ClerkAuthenticatable                       # mixes in current_clerk_user, current_professional, ...

  set_current_tenant_through_filter                   # from acts_as_tenant gem — says "I'll set the tenant manually"
  before_action :set_current_professional_as_tenant   # runs before every action
  around_action :with_rls_tenant_setting              # wraps every action in a transaction
end
```

- `set_current_professional_as_tenant` calls `set_current_tenant(current_professional)`. This is acts_as_tenant's app-layer tenant scoping (adds `WHERE professional_id = ?` to every tenant-scoped query automatically).
- `with_rls_tenant_setting` is an *around_action* — it runs, yields to the action, and runs more code after. Inside, it opens a DB transaction, `SET LOCAL app.professional_id = '<uuid>'`, and `SET LOCAL ROLE authenticated`. The Postgres RLS policy on `clients` reads that GUC.

### Step 4 — ClientsController#index runs

```ruby
before_action :require_clerk_user!                    # redirects to /sign-in if unsigned
before_action :enforce_client_quota!, only: [:new, :create]  # not on index — skipped here

def index
  @clients = Client.order(created_at: :desc)
end
```

`Client.order(...)` is the ActiveRecord query builder (like a Prisma call). It returns a lazy `Relation` — the SQL doesn't run until something iterates it.

**Two filters are now active on this query:**
- `acts_as_tenant` injects `WHERE clients.professional_id = <current tenant>`
- RLS at the DB level *also* filters by `current_setting('app.professional_id')` — defense in depth

### Step 5 — View renders

By convention, `ClientsController#index` renders `app/views/clients/index.html.erb`. The view can read `@clients` directly (the controller's instance variables are copied into the view context).

### Step 6 — around_action tails off

The `with_rls_tenant_setting` transaction commits; `SET LOCAL` auto-resets; the response goes back out.

---

## 5. The domain model in this spike

```
Clerk User (external)
     │ 1:1 (by clerk_user_id)
     ▼
Professional (the tenant)  ──has many──▶ Client
     │                                    │
     │                                    │ (professional_id + client_id unique)
     │                                    ▼
     └──has Pay::Customer──▶ Stripe    Conversation ──has many──▶ Message
```

- **Professional** = the service provider. The tenant boundary. Wraps one Clerk user. Is a Pay customer (Stripe subscriber).
- **Client** = end-user of the Professional. No login in this spike (Rs9 "Portal" is the future phase).
- **Conversation** = 1:1 between one Professional and one Client.
- **Message** = text in a Conversation. Broadcasts to WebSocket subscribers on create.

All tables use UUID primary keys (Supabase-style).

---

## 6. Auth (Clerk)

Clerk runs outside Rails. The Rails app trusts what Clerk's Rack middleware provides.

**Key file: `app/controllers/concerns/clerk_authenticatable.rb`**

```ruby
def current_clerk_user
  return nil unless clerk_signed_in?
  @current_clerk_user ||= clerk_proxy.user          # memoized per request
end

def current_professional
  return nil unless current_clerk_user
  @current_professional ||= Professional.upsert_from_clerk!(current_clerk_user)
end

def require_clerk_user!
  redirect_to sign_in_path unless clerk_signed_in?
end
```

- `clerk_proxy` reads `request.env["clerk"]` (set by the middleware).
- `current_professional` is **lazily upserted** — first time we see a Clerk user id, we create a row in `professionals`.
- `helper_method :current_clerk_user, :current_professional, :clerk_signed_in?` exposes those to **views** too (so templates can say `current_professional.email`).

**Webhook path** — `POST /webhooks/clerk` (`app/controllers/webhooks/clerk_controller.rb`):
- Verified with the `svix` gem using `CLERK_WEBHOOK_SECRET` headers.
- Handles `user.created`, `user.updated`, `user.deleted`.
- The `ClerkUserPayload` inner class adapts the JSON shape to the same duck-typed interface `Professional.upsert_from_clerk!` expects — so HTTP sign-in and webhook sync share one code path.

---

## 7. Multi-tenancy — two layers of defense

### Layer 1 — `acts_as_tenant` (app level)

Models declare their tenant column:

```ruby
# app/models/client.rb
class Client < ApplicationRecord
  acts_as_tenant :professional
  validates :full_name, presence: true
end
```

With `set_current_tenant(current_professional)` set on every request, any `Client.where(...)` gets `AND professional_id = <current>` spliced in automatically. Creating a Client auto-fills `professional_id`. Cross-tenant `.find(bad_id)` raises `ActsAsTenant::Errors::TenantIsImmutable`.

### Layer 2 — Postgres RLS (DB level)

`db/migrate/20260423081721_enable_rls_on_clients.rb`:

```ruby
execute <<~SQL
  ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
  ALTER TABLE clients FORCE ROW LEVEL SECURITY;

  CREATE POLICY clients_tenant_isolation ON clients
    USING      (professional_id = NULLIF(current_setting('app.professional_id', true), '')::uuid)
    WITH CHECK (professional_id = NULLIF(current_setting('app.professional_id', true), '')::uuid);
SQL
```

- `FORCE` is critical — without it, table owners (including Supabase's `postgres` role) bypass RLS.
- `current_setting('app.professional_id', true)` reads the per-transaction GUC. `NULLIF(..., '')` turns an unset value into NULL → fails the equality check → returns zero rows. **Fail closed.**

### The glue — `ApplicationRecord.with_tenant_setting`

```ruby
# app/models/application_record.rb
def self.with_tenant_setting(professional_id)
  transaction do
    connection.exec_query(
      "SELECT set_config('app.professional_id', $1, true)",
      "SET app.professional_id",
      [professional_id.to_s]             # bound parameter — no SQL injection surface
    )
    connection.execute("SET LOCAL ROLE authenticated")
    yield
  end
end
```

`ApplicationController`'s `around_action :with_rls_tenant_setting` wraps every request in this block. Why the `SET LOCAL ROLE authenticated`? Supabase's `postgres` role has BYPASSRLS — policies are silently ignored for it. Downgrading to `authenticated` (which lacks BYPASSRLS) makes policies apply.

---

## 8. Real-time messaging (ActionCable + Turbo Streams)

### The pipeline

1. **Subscribe** — in `app/views/conversations/show.html.erb`:

   ```erb
   <%= turbo_stream_from @conversation %>
   ```

   This emits a `<turbo-cable-stream-source>` element whose name is a **signed hash** of the conversation record. When the browser sees it, Turbo opens a WebSocket to `/cable` and subscribes to that stream.

2. **Authenticate the socket** — `app/channels/application_cable/connection.rb`:

   ```ruby
   class Connection < ActionCable::Connection::Base
     identified_by :current_professional

     def connect
       self.current_professional = find_verified_professional
     end
   end
   ```

   The WebSocket upgrade carries the same cookies as HTTP, so `request.env["clerk"]` is populated by the same middleware. If there's no Clerk user, `reject_unauthorized_connection` closes the socket.

3. **Broadcast on create** — `app/models/message.rb`:

   ```ruby
   after_create_commit -> { broadcast_append_to conversation, target: "messages" }
   ```

   After a message row commits, Rails renders `_message.html.erb` for that record and broadcasts it to every subscriber of the conversation stream. Turbo on each client appends the HTML to `<div id="messages">`.

4. **The sender's input clears separately** — `MessagesController#create` responds with a Turbo Stream that replaces the form. The append is already handled by the broadcast, so the sender tab doesn't need a duplicate append.

5. **Transport** — `gem "solid_cable"` uses Postgres as the pub/sub backend (no Redis required). Table: `solid_cable_messages`.

---

## 9. Billing (Pay gem + Stripe)

### The model side — `app/models/professional.rb`

```ruby
pay_customer stripe_attributes: :stripe_attributes
```

That single line makes `Professional` a Pay customer: it gets `professional.payment_processor`, `.subscription`, `.checkout(...)`, `.billing_portal(...)`, etc.

```ruby
def current_plan
  sub = payment_processor&.subscription
  return "free" unless sub&.active?
  Plans.id_for_stripe_price(sub.processor_plan) || "free"
end

def subscribed_and_within_quota?(resource_key)
  return false unless payment_processor&.subscription&.active?
  limit = Plans.limit_for(current_plan, resource_key)
  return true if limit.nil?
  usage_for(resource_key) < limit
end
```

### The plan catalog — `config/initializers/plans.rb`

```ruby
module Plans
  CONFIG = {
    "starter" => { stripe_price_id: ENV["STRIPE_STARTER_PRICE"], max_clients: 15,  label: "Starter" },
    "growth"  => { stripe_price_id: ENV["STRIPE_GROWTH_PRICE"],  max_clients: 50,  label: "Growth"  },
    "pro"     => { stripe_price_id: ENV["STRIPE_PRO_PRICE"],     max_clients: 150, label: "Pro"     }
  }.freeze
end
```

Single source of truth for "which Stripe price is which plan, and what are its limits."

### The controller — `BillingsController`

- `GET /billing` — shows current plan + usage.
- `GET /billing/upgrade` — plan-picker page.
- `POST /billing/checkout` — creates a Stripe Checkout Session and redirects to Stripe.
- `POST /billing/portal` — creates a Stripe Billing Portal session for subscription management.

Stripe webhooks land at `/pay/webhooks/stripe` — mounted and signature-verified automatically by the Pay engine.

### The quota gate — in `ClientsController`

```ruby
before_action :enforce_client_quota!, only: [:new, :create]

def enforce_client_quota!
  return if current_professional.subscribed_and_within_quota?(:max_clients)
  # ... redirect to upgrade page with alert ...
end
```

If the professional isn't subscribed or hit their plan's client cap, `/clients/new` and `POST /clients` redirect to the upgrade page instead.

---

## 10. How to read a controller / view / model quickly

### Reading a controller

```ruby
class ClientsController < ApplicationController
  before_action :require_clerk_user!                          # (1) hooks at the top
  before_action :enforce_client_quota!, only: [:new, :create]
  before_action :set_client, only: :show

  def index                                                    # (2) actions — one per route
    @clients = Client.order(created_at: :desc)                 #     assignment to @ = available to view
  end

  def create
    @client = Client.new(client_params)
    if @client.save                                            # (3) branch on save success
      redirect_to clients_path, notice: "Client created."      #     flash message in query-string cookie
    else
      render :new, status: :unprocessable_entity               #     422 + re-render the form with errors
    end
  end

  private                                                       # (4) everything below is internal

  def client_params
    params.require(:client).permit(:full_name, :email, :phone) # (5) strong params — the allowlist
  end
end
```

Read top-to-bottom. Filters → actions → privates. `client_params` is Rails's equivalent of Zod parsing the body — it's required to avoid mass-assignment vulnerabilities.

### Reading a view (ERB)

```erb
<% @clients.each do |client| %>              <%# <% %>  runs Ruby, discards output       %>
  <%= link_to client.full_name, client %>    <%# <%= %> runs Ruby, inserts output (escaped) %>
<% end %>
```

- `<% %>` — logic, no output (like `{}` in JSX's body).
- `<%= %>` — interpolate expression into HTML (like `{expr}` in JSX).
- `<%# %>` — comment.
- Files starting with `_` (e.g. `_message.html.erb`) are **partials** — rendered via `render "messages/message"` or `render message` (the latter infers the partial from the model class).

### Reading a model

```ruby
class Message < ApplicationRecord
  acts_as_tenant :professional                                  # macro: scopes all queries to current tenant
  belongs_to :conversation                                      # association: adds .conversation method
  belongs_to :professional
  has_many :messages, -> { order(created_at: :asc) }            # association with scope (only in Conversation)

  validates :body, presence: true                               # rejects save if body is blank

  before_validation :inherit_tenant_from_conversation, on: :create   # lifecycle callback
  after_create_commit -> { broadcast_append_to conversation, target: "messages" }

  private
  def inherit_tenant_from_conversation
    self.professional_id ||= conversation&.professional_id
  end
end
```

Macros at the top declare behaviour; methods at the bottom implement callbacks. DB columns are *implicit* — ActiveRecord reads the schema and exposes them as methods. There's no TypeScript interface listing fields; run `bin/rails console` and call `Message.column_names` if you need the list.

---

## 11. TypeScript → Rails cheat-sheet

| You want to... | TS/Node | Rails |
|---|---|---|
| Install a dep | `npm install foo` | Add `gem "foo"` to `Gemfile`; `bundle install` |
| Run dev server | `npm run dev` | `bin/dev` (reads `Procfile.dev`) |
| Generate a thing | (scaffolding varies) | `bin/rails generate model Foo name:string` |
| Migrate DB | `prisma migrate dev` | `bin/rails db:migrate` (creates `db/migrate/*.rb`) |
| Open a REPL w/ DB | `node` / `prisma studio` | `bin/rails console` |
| Query: `findMany` | `prisma.user.findMany()` | `User.all`, `User.where(...)` |
| Query: `findUnique` | `prisma.user.findUnique({ where: ... })` | `User.find(id)`, `User.find_by(email: ...)` |
| Create row | `prisma.user.create({ data })` | `User.create!(attrs)` |
| Transaction | `prisma.$transaction([...])` | `User.transaction do ... end` |
| Middleware | Express/Hono middleware fn | `before_action` / `around_action` / Rack middleware |
| DI / context | React context, request-scoped DI | `Current` attributes, instance variables on the controller |
| Strong types at boundaries | Zod | `params.require(:x).permit(:a, :b)` (strong params) |
| Background jobs | BullMQ, Trigger.dev | Active Job + Solid Queue (already in this spike) |
| WebSockets | Socket.IO, ws | Action Cable + Solid Cable (Postgres transport) |
| Env vars | `process.env.X` | `ENV["X"]` or `ENV.fetch("X", default)` |
| Secrets | `.env` + dotenv | `.env` via `dotenv-rails` (dev); `config/credentials.yml.enc` (prod) |
| JSX component | React component | Partial (`_foo.html.erb`) or ViewComponent (`view_component` gem) |
| Tests | Vitest/Jest | Minitest (`bin/rails test`) |
| Lint | ESLint/Prettier | RuboCop (`rubocop-rails-omakase`) |

### A few Rails-isms that don't exist in TS-land

- **Autoloading**: Rails loads class files based on filename. `app/models/client.rb` must define `Client`. `app/controllers/webhooks/clerk_controller.rb` must define `Webhooks::ClerkController`. You don't write `require` / `import` inside `app/`.
- **Implicit rendering**: a controller action that doesn't call `render` or `redirect_to` will render `app/views/<controller>/<action>.html.erb` automatically.
- **Flash messages**: `redirect_to path, notice: "..."` stores a one-shot message in the session; the layout reads it via `flash[:notice]`.
- **The Rails console** (`bin/rails console`) is the fastest way to explore data: it's an IRB REPL with the whole app loaded, so you can run `Professional.first.clients` interactively.

---

## Suggested reading order for code review

1. `config/routes.rb` — the sitemap.
2. `app/controllers/application_controller.rb` + `app/controllers/concerns/clerk_authenticatable.rb` — request lifecycle + auth.
3. `app/models/application_record.rb` + `db/migrate/20260423081721_enable_rls_on_clients.rb` — multi-tenancy guts.
4. `app/models/professional.rb`, `client.rb`, `conversation.rb`, `message.rb` — domain.
5. `app/controllers/clients_controller.rb` — standard RESTful controller + quota gate.
6. `app/views/conversations/show.html.erb` + `app/channels/application_cable/connection.rb` + `app/models/message.rb` `after_create_commit` — real-time flow (three files, one pipeline).
7. `config/initializers/plans.rb` + `app/controllers/billings_controller.rb` + `app/models/professional.rb` `#current_plan`, `#subscribed_and_within_quota?` — billing.

Skip `app/controllers/notes_controller.rb` and `app/models/note.rb` — they're Day 1 scaffold leftovers, not part of the product.
