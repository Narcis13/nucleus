<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:services-architecture -->
# Services architecture (prevalent pattern)

Business logic lives in `lib/services/<domain>/<verb>.ts` — transport-agnostic, takes a `ServiceContext` and pre-validated input, returns a typed DTO. Server actions in `lib/actions/` are thin shells: parse Zod input via `.inputSchema(...)`, call the service, then handle Next.js transport (`revalidatePath`, `redirect`, `cookies`). Future non-RSC consumers (MCP tools, HTTP API, AI features in vertical packages, background jobs) call the service layer directly and bypass the action shell.

**Boundary rule:**

| Belongs in **service** | Belongs in **action** |
|---|---|
| DB reads/writes (`ctx.db.*`) | `revalidatePath`, `revalidateTag` |
| External API calls (Stripe, Resend, Trigger.dev) | `redirect`, `cookies()`, `headers()` |
| Business orchestration & invariants | Zod input parsing (via `.inputSchema(...)`) |
| Semantic events (`trackServerEvent`) | Translating thrown service errors → response |
| Automation trigger evaluation (`evaluateTrigger`) | |

**Service signature:**

```ts
async function <verb><Domain>(
  ctx: ServiceContext,                 // { userId, orgId, db: Tx }
  input: <Verb><Domain>Input,          // already validated upstream
): Promise<<Verb><Domain>Result>
```

Errors thrown from services are typed (`lib/services/_lib/errors.ts`); the action middleware translates them. Action input/output shapes must not change when extracting — pure refactor.

**When writing new domain logic:** write the service first, then the action shell. When editing an existing not-yet-migrated action, extract it to a service in the same change if cost is reasonable; otherwise leave a TODO and proceed without blocking the immediate task.

**Canonical reference:** `core-pro/docs/services-pattern.md` — read it before writing or migrating service/action code.

**Migration state:** rollout started 2026-04-25. Pilot domain: `clients`. Other domains in `lib/actions/` may still hold inline logic — that's expected during rollout, not a license to add new inline logic. Phased plan and rollout history: `core-pro/docs/services-extraction-plan.md`.
<!-- END:services-architecture -->
