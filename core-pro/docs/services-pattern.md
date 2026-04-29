# Services Pattern — Canonical Reference

**Status:** Adopted 2026-04-25 (pilot: `clients`). This is the binding convention for new and migrated business logic in `core-pro/`. Rollout history, phased plan, and effort estimates live in `services-extraction-plan.md` — keep that for context, not for "how do I do this today."

## Why this layer exists

`core-pro/` is the generic CRM common ground. Vertical packages (real estate first) will add AI features, schema, and UI on top, and we expect a second non-RSC consumer eventually (MCP tools, HTTP API, background jobs). Business logic must be transport-agnostic so every consumer can call it without reaching through Next.js RSC primitives.

**Server actions are the transport shell.** Services are the logic.

## The pattern

### Action (transport shell)

```ts
// lib/actions/clients.ts
export const createClientAction = authedAction
  .metadata({ actionName: "clients.create" })
  .inputSchema(clientInputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await createClient(ctx, parsedInput)
    revalidatePath("/dashboard/clients")
    return result
  })
```

### Service (transport-agnostic)

```ts
// lib/services/clients/create.ts
import "server-only"
import type { ServiceContext } from "../_lib/context"
import { PlanLimitError, UnauthorizedError } from "../_lib/errors"

export type CreateClientInput = { /* ... */ }
export type CreateClientResult = { id: string; invited: boolean }

export async function createClient(
  ctx: ServiceContext,         // { userId, orgId, db: Tx }
  input: CreateClientInput,    // already validated by the action
): Promise<CreateClientResult> {
  // DB reads/writes, external SDKs, business invariants, events, automation triggers.
  // No revalidatePath / redirect / cookies / headers in here. Ever.
}
```

## Boundary rule

| Belongs in **service** | Belongs in **action** |
|---|---|
| DB reads/writes (`ctx.db.*`) | `revalidatePath`, `revalidateTag` |
| External API calls (Stripe, Resend, Trigger.dev, Clerk) | `redirect`, `cookies()`, `headers()` |
| Business orchestration & invariants | Zod input parsing (via `.inputSchema(...)`) |
| Semantic events (`trackServerEvent`) | Translating thrown service errors → response |
| Automation trigger evaluation (`evaluateTrigger`) | Anything that only makes sense in a browser-driven RSC context |

If you're unsure: would an MCP tool, cron job, or HTTP route need this code? If yes, it goes in the service. If it's literally a Next.js cache hint or a redirect, it stays in the action.

## Conventions

| Decision | Choice |
|---|---|
| Folder layout | `lib/services/<domain>/<verb>.ts` — one file per service function. When the action-file domain name would clash with the `services/` parent folder (e.g. `lib/actions/services.ts` → `lib/services/services/` is hideous), pick a clarifying synonym: the `services` action file maps to `lib/services/catalog/`. |
| Style | Free functions, not classes |
| Service context | `ServiceContext = { userId: string; orgId: string \| null; db: Tx }` from `lib/services/_lib/context.ts`. **Exception:** services called from `publicAction` (no RLS, optionally authenticated) take primitives directly — see "Public-action services" below. |
| Validation | Zod schemas live in the action file; the action parses via `.inputSchema(...)` and passes typed input to the service |
| Errors | Throw typed errors from `lib/services/_lib/errors.ts` (`ServiceError` and subclasses: `UnauthorizedError`, `NotFoundError`, `PlanLimitError`, …). The `safe-action` `handleServerError` already translates them to user-safe messages. |
| Events | `trackServerEvent` (PostHog) and `evaluateTrigger` (automations) live in the service so non-action consumers emit the same events |
| External SDKs | Compose the existing wrappers in `lib/clerk`, `lib/stripe`, `lib/email`, `lib/integrations/*`. Don't add another layer. |
| Action contract | **Input/output shapes must not change** during extraction. Pure refactor — the UI keeps working unchanged. |
| `"server-only"` | Every service file imports `"server-only"` at the top |

## Error model

- Add a new typed error to `lib/services/_lib/errors.ts` only when the action layer or a future caller needs to distinguish it from generic failure (e.g. plan-gating, auth, not-found, validation invariants beyond Zod's reach).
- Don't reach for `ActionError` from inside a service — that's the action-layer counterpart. Throw `ServiceError` (or a subclass) and let the middleware translate.
- Generic infrastructure failures (DB down, third-party 500) bubble as plain `Error` and are masked to `DEFAULT_SERVER_ERROR_MESSAGE`. That's the desired behavior — don't catch and rewrap.

## Events and side effects

- Events that describe a domain fact (`client.created`, `appointment.booked`) belong in the service. Future consumers must emit the same events; co-locating ensures they do.
- Events that describe a UI fact (modal opened, form submitted) stay in the client component. Don't fire those from a service.
- `void evaluateTrigger(...).catch(() => {})` — automations are best-effort and never fail the parent operation.

## Adding a new service (or migrating an existing action)

1. Create `lib/services/<domain>/<verb>.ts`.
2. Define `<Verb><Domain>Input` and `<Verb><Domain>Result` types alongside the function.
3. Move all DB calls, external SDK calls, event tracking, and automation triggers into the service. Keep the function pure of `revalidatePath` / `redirect` / `cookies` / `headers`.
4. Throw typed errors from `_lib/errors.ts` instead of returning failure shapes — except where the action contract already returns a discriminated union (don't break the UI).
5. In the action, replace the inline body with: parse Zod (already done by `.inputSchema`), call the service, attach `revalidatePath` / `redirect` as needed, return the service result unchanged.
6. Run the full Playwright suite. Smoke the affected dashboard route in dev. The action's input/output must be byte-identical to before.

## Adding new business logic

Write the service first, then the action shell. Don't put new DB logic into an action "temporarily" — that "temporary" code is what we're removing.

When editing a not-yet-migrated action, extract it to a service in the same change if cost is reasonable. Otherwise leave a `TODO(services-pattern)` and proceed without blocking the immediate task. Migration state is tracked in `services-extraction-plan.md`.

## Public-action services

Most services run inside `authedAction`'s `withRLS` transaction and take a `ServiceContext`. A few — locale switching, micro-site visitor capture, public form submissions — run from `publicAction` where there is no RLS-scoped Tx and `userId` may be absent. For those:

- Skip `ServiceContext`. Take the primitives the function actually needs (`userId: string`, plus the input).
- Use `dbAdmin` deliberately and document why in a one-line comment (typically: write happens during an auth transition, or the row predates any RLS-eligible identity).
- Keep the same one-function-per-file layout; treat the absence of `ctx` as the documented signal that this service has different auth assumptions.

Example: `lib/services/locale/set-user-locale.ts` — signature is `setUserLocale(userId, locale)`, writes through `dbAdmin` to two tables, swallows nothing (caller decides whether persistence failure is fatal).

## What stays out of `lib/services/`

- `revalidatePath`, `revalidateTag`, `redirect`, `cookies()`, `headers()` — RSC transport.
- Form state shapes that only matter to a specific React component.
- React Server Components themselves. Services return data; rendering is a transport concern.

## ESLint enforcement

Deferred. A rule banning `lib/db` imports outside `lib/services/` and `lib/db/` is on the table but not worth the bikeshed until at least half the domains are migrated and the pattern is proven sticky. Revisit after Phase 2.
