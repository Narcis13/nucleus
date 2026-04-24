# The nucleus API pattern

Every session from Rs5 onward follows the same shape: one service object,
two thin controllers, one alba resource. This document exists so that
future sessions don't re-derive the pattern. If you're about to write
business logic in a controller, stop and read this.

## The rule

> HTML controllers and API controllers are adapters. The service object is
> the only place writes happen. The resource is the only place JSON shape
> is defined.

- `app/services/<domain>/<action>.rb` — returns `Result`.
- `app/controllers/<domain>_controller.rb` — HTML. Calls the service,
  renders HTML, flashes/redirects.
- `app/controllers/api/v1/<domain>_controller.rb` — JSON. Calls the same
  service, renders a resource, uses the error envelope.
- `app/resources/api/v1/<domain>_resource.rb` — alba class. Single source
  of truth for the JSON shape.

If those four files don't all exist for a new feature, it's not done.

## Before / after

What the spike would have looked like if Messaging had shipped in Rs4.5:

**Before** — business logic tangled in the controller.

```ruby
# app/controllers/messages_controller.rb
class MessagesController < ApplicationController
  def create
    @conversation = Conversation.find(params[:conversation_id])
    @message = @conversation.messages.build(message_params)
    @message.sender_clerk_id = current_professional.clerk_user_id
    if @message.save
      Turbo::StreamsChannel.broadcast_append_to(...)
      redirect_to conversation_path(@conversation)
    else
      render :new, status: :unprocessable_content
    end
  end
end
```

Now build the API version and you either copy-paste all of that or extract
it. Copy-paste rot is where bugs live — one side gets a nil check the other
side doesn't, and the two diverge. So: extract.

**After** — service object owns the write; controllers adapt.

```ruby
# app/services/messages/create.rb
module Messages
  class Create < ApplicationService
    def initialize(conversation:, sender:, body:)
      @conversation = conversation
      @sender = sender
      @body = body
    end

    def call
      message = @conversation.messages.build(body: @body, sender_clerk_id: @sender.clerk_user_id)
      return failure(:invalid, errors: message.errors) unless message.save

      Turbo::StreamsChannel.broadcast_append_to(@conversation, target: "messages", partial: "messages/message", locals: { message: message })
      success(message: message)
    end
  end
end
```

```ruby
# app/controllers/messages_controller.rb (HTML)
class MessagesController < ApplicationController
  def create
    conversation = policy_scope(Conversation).find(params[:conversation_id])
    result = Messages::Create.call(
      conversation: conversation, sender: Current.professional, body: params[:message][:body]
    )
    if result.success?
      redirect_to conversation_path(conversation)
    else
      @conversation = conversation
      @message = conversation.messages.build(body: params[:message][:body])
      @message.errors.merge!(result.errors) if result.errors
      render :new, status: :unprocessable_content
    end
  end
end
```

```ruby
# app/controllers/api/v1/messages_controller.rb (JSON)
module Api
  module V1
    class MessagesController < BaseController
      before_action -> { require_scope!("messages:write") }, only: %i[create]

      def create
        conversation = Conversation.find(params[:conversation_id])
        result = Messages::Create.call(
          conversation: conversation,
          sender: Current.professional,
          body: params.require(:message).require(:body)
        )

        if result.success?
          render json: { message: Api::V1::MessageResource.new(result[:message]).serializable_hash },
                 status: :created
        else
          render_result_failure(result)
        end
      end
    end
  end
end
```

`git grep 'def create'` over those two controllers shows zero business
logic — only parameter wrangling and response shaping.

## Service objects: `ApplicationService` + `Result`

- Subclass `ApplicationService`, expose an `initialize` that takes the
  relevant domain inputs, implement `#call`. Callers always invoke
  `Messages::Create.call(...)` — the class method instantiates once and
  delegates.
- Return `success(**payload)` or `failure(code, errors: , message:)`.
- Codes are symbols from a small, stable vocabulary:
  `:invalid`, `:not_found`, `:forbidden`, `:unauthenticated`,
  `:conflict`, `:rate_limited`. The API base controller maps these to
  HTTP statuses via `Api::ErrorHandling::FAILURE_STATUS`.
- Never let the controller guess the status. `render_result_failure(result)`
  does the mapping in one place.

## API base controller

`Api::V1::BaseController` inherits from `ActionController::API`. It
includes three concerns:

- `Api::TokenAuth` — Bearer PAT parsing, identity resolution, RLS-wrapped
  verification. See the "Auth flow" section below.
- `Api::ErrorHandling` — 4xx envelope, 5xx request-id-only, rescue maps for
  common exceptions.
- `Api::Pagination` — pagy wrappers that emit `Link` + `X-Total-Count`.

**Do not** add cookie-based authentication to this base class. The base is
token-only by construction; removing CSRF there is safe specifically because
there is no cookie path. The request spec
`spec/requests/api/v1/me_spec.rb` asserts that a cookie alone does not
authenticate — that test is the guardrail that makes this safe.

## Auth flow

The risk: if the token lookup ran under BYPASSRLS and never re-verified
under RLS, a token belonging to a deleted tenant could keep working.

The mitigation, in order:

1. Parse `Authorization: Bearer nuc_pat_<id_hex>.<secret>` in
   `Api::TokenAuth#authenticate_with_personal_access_token!`.
2. **Phase 1 — BYPASSRLS lookup**:
   `PersonalAccessToken.unscoped.find_by(id: pat_id)`. This is identity
   resolution. It mirrors how `ApplicationController#set_current_context`
   looks up a Professional by `clerk_user_id` before the tenant is pinned.
3. Constant-time bcrypt compare on the secret. Revoked / expired short-
   circuit.
4. Set `Current.professional`, `Current.organization`,
   `Current.personal_access_token`.
5. Open `ApplicationRecord.with_tenant_setting(professional_id:, organization_id:)`.
   Inside the block the connection runs as the `authenticated` role (no
   BYPASSRLS) with both GUCs set.
6. **Phase 2 — RLS-enforced refetch**: `PersonalAccessToken.find_by(id: pat.id)`.
   If the tenant was deleted (or otherwise RLS-hidden), this returns nil
   and we bail with 401 *before* the action runs.
7. Yield to the action. Everything it touches is RLS-filtered.

## Scopes

- Format: `resource:action`, e.g. `clients:read`, `messages:write`.
- `write` implies `read` for the same resource (see
  `PersonalAccessToken#has_scope?`). Keep this implication narrow —
  don't add `admin` or hierarchical scopes without a written decision.
- Enforcement in a controller:
  ```ruby
  before_action -> { require_scope!("clients:write") }, only: %i[create update destroy]
  ```
- `/api/v1/me` has no scope requirement. Any valid token may introspect
  its own identity; that matches GitHub's `/user` endpoint and is what
  agents use to bootstrap.

## Error envelope

```json
{
  "error": {
    "code": "invalid",
    "message": "Validation failed",
    "details": {
      "name": ["can't be blank"]
    }
  }
}
```

- 4xx always carries the envelope. `details` is optional and, for
  validation failures, is the `ActiveModel::Errors#as_json` shape.
- 5xx collapses to `{ "error": { "code": "server_error", "request_id": "..." } }`.
  Never leak stack traces; Sentry captures the full context out of band.
- Cross-tenant reads always return **404, not 403**. The row is invisible
  under RLS, and we don't confirm its existence to an unauthorized caller.
  Controllers get this for free by relying on the default tenant scope;
  they never need to explicitly compare `organization_id` in user code.

## Pagination

- List endpoints call `pagy(scope, items: 25)` (25 is the pagy default,
  set in `config/initializers/pagy.rb`).
- Emit headers via `set_pagination_headers(pagy)`:
  - `X-Total-Count`, `X-Page`, `X-Per-Page`
  - `Link: <...>; rel="first", <...>; rel="last"` (+ `prev`/`next` when
    they exist)
- Keep response bodies to the collection itself. If a client needs
  metadata other than counts, design that in once — don't sprinkle it
  ad hoc into each list.

## Rate limits

`config/initializers/rack_attack.rb`:

- **600 req/min/token**: keyed on the 32-hex token id parsed from the
  `Authorization` header. Keying on the id (not the full header) keeps
  us from leaking the secret into cache keys.
- **50 req/min/IP** for unauthenticated `/api/v1` calls. Any legitimate
  client has a token; floor is for probes.
- 429 responses use the same `{ error: { code: "rate_limited", ... } }`
  envelope with a `Retry-After` header (seconds to bucket reset).

Dashboard and Hotwire traffic are **not** rate-limited in this initializer.

## Token model

`PersonalAccessToken` is the credential and the RLS row. Layout:

- `id` (uuid) — embedded in the presented token as the lookup key.
- `professional_id`, `organization_id` — owner + RLS tenant.
- `name` — human label.
- `token_digest` — bcrypt hash of the random secret. Plaintext is shown
  exactly once at issue time (`flash[:plaintext_token]`).
- `scopes` (jsonb array) — e.g. `["clients:read", "messages:write"]`.
- `last_used_at` (throttled to once/minute writes).
- `expires_at` — optional. `revoked_at` — set on revoke, never unset.

RLS policy: `organization_id = current_setting('app.organization_id')`.
Same `NULLIF(...)::uuid` fail-closed pattern as Rs3's audit_logs.

## Checklist for Rs5 onward

When adding a new resource (clients, leads, services, …):

- [ ] `app/services/<domain>/*` for every write (create, update, destroy,
      and any domain verb like `convert`, `move`, `cancel`).
- [ ] `<Domain>Controller` (HTML) — calls service, redirects/flashes.
- [ ] `Api::V1::<Domain>Controller` (JSON) — calls service,
      renders resource, uses `render_result_failure` on failure.
- [ ] `Api::V1::<Domain>Resource` (alba) — declare attributes explicitly.
- [ ] `before_action -> { require_scope!("<domain>:read") }` on read
      actions, `<domain>:write` on mutations.
- [ ] Request spec asserting: missing token → 401, wrong scope → 403,
      cross-tenant → 404, pagination headers present, happy path.
- [ ] Pundit policy on the HTML side. The API relies on scopes + RLS;
      the HTML side relies on Pundit + RLS.

If you're tempted to put business logic in a controller "just for this
one endpoint", it will not stay just one. Write the service.
