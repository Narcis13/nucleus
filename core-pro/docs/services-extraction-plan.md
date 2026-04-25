# Services Layer Extraction Plan

**Status:** Plan agreed 2026-04-25. Pilot: `clients` domain. Tracking: ad-hoc PRs (no GSD/LPL phase).

## Why

`core-pro/` is the generic CRM common ground; vertical implementations (real estate first) will add their own AI features, schema, and UI on top. To prepare for that — and to make any future MCP / HTTP API / agentic surface tractable — business logic must live in a transport-agnostic layer that every consumer (server actions today; MCP tools, HTTP routes, background jobs, AI features later) can call.

Today, business logic is co-located inside `next-safe-action` server actions in `core-pro/lib/actions/*.ts`. Server actions are 90% API-like already (Zod input, RLS-scoped via `withRLS`, clean DTO output) but coupled to Next.js RSC primitives (`revalidatePath`, `redirect`, `cookies`). The extraction separates those concerns.

**Scope of this work: structural only.** No feature changes. No AI work. Action input/output shapes do not change.

## The pattern

### Before (today)

```ts
// lib/actions/clients.ts
export const createClientAction = authedAction
  .metadata({ actionName: "clients.create" })
  .inputSchema(clientInputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const professional = await getProfessional(ctx.db, ctx.userId);
    const [client] = await ctx.db.insert(clients).values({...}).returning();
    await ctx.db.insert(professionalClients).values({...});
    void trackServerEvent("client.created", {...});
    void evaluateTrigger("client_created", {...}).catch(() => {});
    revalidatePath("/dashboard/clients");
    return { id: client.id, invited: false };
  });
```

### After

```ts
// lib/services/clients/create.ts  -- transport-agnostic, testable
export type CreateClientInput = z.infer<typeof clientInputSchema>;
export type CreateClientResult = { id: string; invited: boolean };

export async function createClient(
  ctx: ServiceContext,           // { userId, orgId, db: Tx }
  input: CreateClientInput,      // already validated
): Promise<CreateClientResult> {
  const professional = await getProfessional(ctx.db, ctx.userId);
  const [client] = await ctx.db.insert(clients).values({...}).returning();
  await ctx.db.insert(professionalClients).values({...});
  trackServerEvent("client.created", {...});
  void evaluateTrigger("client_created", {...}).catch(() => {});
  return { id: client.id, invited: false };
}
```

```ts
// lib/actions/clients.ts  -- thin shell, owns transport concerns
export const createClientAction = authedAction
  .metadata({ actionName: "clients.create" })
  .inputSchema(clientInputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await createClient(ctx, parsedInput);
    revalidatePath("/dashboard/clients");
    return result;
  });
```

### Boundary rule

| Belongs in **action** | Belongs in **service** |
|---|---|
| `revalidatePath`, `revalidateTag` | DB reads/writes |
| `redirect` | External API calls (Stripe, Resend, Trigger.dev) |
| `cookies()`, `headers()` | Business orchestration, validation invariants |
| Zod input parsing (via `.inputSchema`) | Semantic event tracking (`trackServerEvent`) |
| Translating thrown service errors → response | Automation trigger evaluation |

If something only makes sense in a browser-driven RSC context, it stays in the action. Everything else moves down.

## Conventions

| Decision | Choice |
|---|---|
| Folder layout | `lib/services/<domain>/<verb>.ts` (one file per service function) |
| Style | Free functions, not classes/objects |
| Service context | `ServiceContext = { userId: string; orgId: string \| null; db: Tx }` — defined in `lib/services/_lib/context.ts` |
| Validation | Zod schemas live alongside services, but the **action layer parses** via `.inputSchema(...)`; services receive typed, pre-validated input |
| Errors | Throw typed errors (e.g. `ClientNotFoundError`, `PlanLimitExceededError`) defined in `lib/services/_lib/errors.ts`. Action middleware translates them. |
| Events | `trackServerEvent` lives in services (semantic events). Future non-action consumers must emit the same events. |
| External SDKs | Services compose the existing `lib/stripe`, `lib/email`, `lib/integrations/*` wrappers. Don't add another layer. |
| Action contract | **Input/output shapes must not change** during extraction. Pure refactor — the UI keeps working unchanged. |
| Tests | Decision pending — see Open Questions. |

## Phased rollout

### Phase 0 — Pilot: `clients` domain

Single PR, ~1 day.

- Create `lib/services/_lib/context.ts` (the `ServiceContext` type) and `lib/services/_lib/errors.ts` (base error classes + the action-layer translator).
- Create `lib/services/clients/` and extract all 9 actions in `lib/actions/clients.ts`:
  `create`, `update`, `archive`, `addTag`, `removeTag`, `bulkAddTag`, `createTag`, `deleteTag`, `export`.
- Refactor each action to delegate to the service.
- Run existing Playwright tests + manual smoke on `/dashboard/clients`.
- **Goal: lock the pattern.** Once this PR lands, every other domain follows the same shape.

### Phase 0.5 — Magic-link client portal access

**Status:** Plan agreed 2026-04-25. Depends on Phase 0 landing first (uses the freshly extracted `clients` service layer). Verified feasible against stable Clerk APIs (`@clerk/nextjs` + `@clerk/backend`); no canary/beta required.

**Goal:** Replace the current "client receives Clerk org invite → registers an account → logs in to portal" flow with a magic-link / ticket-based flow:

- Agent triggers an invitation; the system returns a URL the agent can send via email, WhatsApp, or SMS (template owned by us, not Clerk's default).
- Client clicks the URL → lands signed in at `/portal`. Existing users see zero forms; first-time users see a single-button confirm page.
- Re-access on a new device: client enters email at `/portal/sign-in` → magic-link email from Clerk → signed in.
- Agent can revoke pending or active access from the clients list.

**Why this lives in core-pro (not the real-estate vertical):** every vertical's counterparty user (owner, patient, student, client) faces the same friction. Generic CRM concern.

**Why stay on Clerk:** preserves all RLS plumbing (`auth.jwt()->>'sub'` against `clients.clerk_user_id`), session management, JWT issuance, breach response, multi-device. Clerk JWTs are auth-method-agnostic — magic-link sign-in produces the same claim shape as password sign-in, so RLS policies need zero changes.

**Verified Clerk surfaces (stable):**

- `clerkClient.organizations.createOrganizationInvitation({ ..., redirectUrl })` returns an `OrganizationInvitation` with a `url` field to embed in our own message.
- `signIn.ticket({ ticket })` for existing users (zero-form sign-in) and `signUp.create({ strategy: 'ticket', ticket })` for first-time users (one-button page at `redirectUrl`).
- `signIn.emailLink.sendLink()` / `signIn.create({ strategy: 'email_link', identifier })` + `prepareFirstFactor({ strategy: 'email_link' })` for lost-link recovery.
- `clerkClient.organizations.revokeOrganizationInvitation(...)` for pending invites; `clerkClient.sessions.revokeSession(...)` for active sessions.
- **No native "resend" endpoint** — workflow is revoke + recreate, which returns a fresh `url`.

**Pre-implementation Clerk dashboard config (do once, before code):**

- Disable Clerk's default invitation email (we send our own).
- Make password requirement off and name fields optional in user instance settings, so the first-time-user `signUp.create({ strategy: 'ticket', ... })` page can be a single confirm button. Without this the ticket flow demands `firstName`/`lastName`/`password`.
- Enable "Restricted" mode (User & Authentication → Restrictions) so portal signup is invite-only.
- Confirm `redirectUrl` allowlist includes our `/accept-invite` route.

**Tasks (one PR per group; all new business logic goes through `lib/services/clients/`, riding the Phase 0 pattern):**

1. **New services in `lib/services/clients/`:**
   - `inviteClientToPortal(ctx, { clientId })` — calls Clerk `createOrganizationInvitation`, persists invite metadata on the client row, returns the `url`.
   - `revokeClientPortalAccess(ctx, { clientId })` — revokes pending invite + any active sessions for that client.
   - `resendClientPortalInvite(ctx, { clientId })` — revoke + recreate.

2. **New `/accept-invite` route (app router):** reads `__clerk_ticket` and `__clerk_status` from the URL.
   - `status === 'complete'` → redirect to `/portal`.
   - `status === 'sign_in'` → `signIn.ticket({ ticket })` → `setActive` → `/portal`.
   - `status === 'sign_up'` → minimal one-button confirm UI → `signUp.create({ strategy: 'ticket', ticket })` → `signUp.finalize()` → `/portal`.

3. **Lost-link recovery at `/portal/sign-in`:** email input → `signIn.create({ strategy: 'email_link', identifier })` + `prepareFirstFactor({ strategy: 'email_link', redirectUrl: '/portal' })` → "check your email" screen.

4. **Agent UI on the clients list:** per-client portal-access status (`not invited / invited / active / revoked`); actions for "Send portal access" (returns URL the agent can copy/forward), "Resend link", "Revoke access".

5. **Invitation email/WhatsApp template** owned by us — embeds the `url` from `createOrganizationInvitation`. Existing Resend integration handles email; WhatsApp send is out of scope for this phase (link is copyable).

**Decisions to make before implementation:**

- **Link reuse vs single-use** — start reusable + short expiry (recommend 7 days). Re-evaluate only if forwarding becomes a real complaint.
- **Canonical email per client** — `clients.email` becomes the source of truth for both invite delivery and lost-link recovery. Define what happens when an agent edits the email after invitation is sent (revoke + reinvite, or update Clerk record).
- **Existing already-Clerk-registered clients** — leave their password sign-in working; they'll naturally migrate to email-link on next visit if they choose to. No forced migration.
- **Email mismatch on lost-link recovery** — `email_link` only works for the email Clerk has on file. UX must show a clear "ask your agent to resend" message on mismatch, not a generic auth error.

**Out of scope for Phase 0.5:**

- Audit log of invitations (defer until there's a real need).
- WhatsApp Business API integration (this phase produces the URL; agents copy it manually for now).
- Per-agent custom invite branding.
- Phone-number-based magic links.

**Effort estimate:** ~2–3 days, assuming Phase 0 has landed cleanly.

**Open question to verify during dashboard config:** Clerk invitation expiry default and whether it's per-invite or global. Not a blocker; resolve while configuring the instance.

### Phase 1 — Conventions doc

Half day, after pilot ships.

- Promote this document (or a tightened version) into `core-pro/docs/services-pattern.md` as the canonical reference.
- Add a one-line pointer in `core-pro/CLAUDE.md` so future Claude sessions follow the pattern automatically.
- Optional: ESLint rule banning `lib/db` imports outside `lib/services/` and `lib/db/` itself. Defer if it bikesheds.

### Phase 2 — Migrate remaining domains

Parallelizable, ~1–2 weeks part-time. One PR per domain. Suggested order (simple → complex):

1. `locale`, `services` (catalog), tag helpers — trivial, validate the pattern at small scale
2. `documents`, `notifications`, `forms` — moderate, mostly CRUD
3. `leads`, `appointments`, `messages` — central, multi-table
4. `invoices`, `marketing`, `automations` — highest complexity (multi-step orchestration, external APIs, plan-gating)
5. `billing`, `settings`, `micro-sites` — Stripe + cookies + revalidation entanglement; do these last because they exercise the most edge cases

### Phase 3 — Cleanup

Half day.

- Grep for remaining `ctx.db.` calls inside `lib/actions/` — should be zero.
- Delete helpers that became unused after extraction.
- Confirm no `revalidatePath` / `redirect` / `cookies` calls leaked into `lib/services/`.

## Effort estimate

- Pilot: 1 day
- 16 domains × ~2–4 hours each: 4–8 days
- Conventions + cleanup: 1 day
- **Total: ~1.5–2 weeks part-time**, shippable incrementally with no UI changes per PR.

## Open questions (unresolved)

- **Service-layer unit tests.** Today there's Playwright e2e but no unit tests at the service layer. Services will be far easier to unit-test than actions (no RSC plumbing). Adding tests as we extract adds ~30% per-domain effort. Decision deferred — revisit at end of Phase 0.

## Out of scope

- AI features of any kind (vertical-specific work, not core-pro structural).
- HTTP API or MCP server (revisit only when there's a real second consumer).
- pgvector / embeddings infrastructure (vertical concern).
- Schema changes (no `properties` table here — that's a real-estate vertical decision).
- Behavioral changes to existing actions.

## Reference: domain inventory

16 domains in `lib/actions/`, ~127 actions total:

`appointments`, `automations`, `billing`, `clients`, `documents`, `forms`, `invoices`, `leads`, `locale`, `marketing`, `messages`, `micro-sites`, `notifications`, `services`, `settings`, plus the `safe-action.ts` factory module (not a domain — defines `publicAction` / `authedAction`).
