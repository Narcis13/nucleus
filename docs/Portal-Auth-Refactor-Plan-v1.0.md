# Client Portal Auth Refactor — Plan v1.0

**Status:** Draft, approved for implementation
**Date:** 2026-04-26
**Scope:** Replace Clerk in the client portal sign-in/session flow with a custom magic-link + cookie session. Clerk stays for agents/professionals.
**Decision context:** No production client-portal users yet — clean cutover. Live chat (Realtime) must keep working.

---

## Problem

The client portal piggy-backs on Clerk's `OrganizationInvitation` + `signUp.ticket()` / `signIn.ticket()` for first-time access, plus `signIn.emailLink` as a recovery path. Clients are DB-first entities (`clients.clerk_user_id` is nullable), so Clerk's user/org-membership lifecycle is an impedance mismatch:

- Half-completed sign-ups leave orphaned Clerk users blocking the next invite. Patched by `clearStalePortalUser()` in commit `e032285` ("fucked flow").
- CAPTCHA timing workarounds.
- Stale-session and React-strict-mode race guards in `accept-invite-client.tsx`.
- Two entangled Clerk strategies (ticket + emailLink) with `__clerk_status`-based branching.

The flow has been re-patched repeatedly without fundamentally fixing the model mismatch. This plan rips Clerk out of the client portal only.

---

## Architecture

```
                                                                             
┌───────────────────────────┐                                                
│  Agent (Clerk) sends      │                                                
│  inviteClientToPortal()   │                                                
└─────────────┬─────────────┘                                                
              ▼                                                              
   ┌──────────────────┐    INSERT row in portal_invites                      
   │  Server Action   │    (token_hash, client_id, expires_at, used_at)      
   └──────┬───────────┘                                                      
          │ Resend → "https://app/portal/verify?token=<raw>"                 
          ▼                                                                  
┌──────────────────────────────────────────────┐                             
│ Client clicks link → GET /portal/verify      │                             
│   • lookup hash, check expiry/used           │                             
│   • mark used_at, INSERT portal_sessions row │                             
│   • Set HttpOnly cookie: nucleus_portal=<id> │                             
└──────────────────────────┬───────────────────┘                             
                           ▼                                                 
            ┌────────────────────────────────┐                               
            │ middleware.ts gates /portal/*  │                               
            │  with cookie session lookup    │                               
            └────────┬───────────────────────┘                               
                     ▼                                                       
   ┌──────────────────────────────────────────────────────────┐              
   │ Server Components / Server Actions read cookie →         │              
   │ resolve client_id → query Drizzle with explicit          │              
   │ `WHERE client_id = ?` (no withRLS for portal path)       │              
   └──────────────────────────────────────────────────────────┘              
                                                                             
   Browser only needs Supabase for Realtime + Storage:                       
                                                                             
   ┌────────────────────────────────────────────────────┐                    
   │ Browser fetches /api/portal/sb-token (server mints │                    
   │ short-lived Supabase JWT signed with SUPABASE_JWT_ │                    
   │ SECRET, sub=client_<id>, role=authenticated)       │                    
   │ → useSupabaseBrowser passes that to accessToken    │                    
   │   callback                                         │                    
   │ → existing Realtime + Storage code unchanged       │                    
   └────────────────────────────────────────────────────┘                    
```

The trust boundary is the cookie. RLS becomes defense-in-depth on the Realtime/Storage path only.

---

## Invariants

- Clerk stays untouched for agents/professionals. This work is scoped to `app/portal/**` and the data flows it owns.
- Stack: Next 15.5 LTS, Drizzle, Supabase, Resend, `next-safe-action`. No new auth library — handroll the magic-link + session (~150 lines).
- Live chat in the portal must keep working.
- Existing professional-side code that reads/writes the same tables (`messages`, `documents`, `clients`, etc.) must keep working unchanged.
- Cookie name: `nucleus_portal`. Session lifetime: 30d sliding. Magic link TTL: 15min, single-use.

---

## Phases

### Phase 1 — DB: `portal_invites` + `portal_sessions`

**Files**
- `core-pro/lib/db/schema/portal_auth.ts` (new)
- `core-pro/supabase/migrations/<timestamp>_portal_auth.sql` (new)

**Schema**
```ts
portal_invites:
  id uuid pk
  client_id uuid fk -> clients.id (cascade delete)
  professional_id uuid fk -> professionals.id
  token_hash bytea not null     // sha256 of raw token
  expires_at timestamptz not null    // now()+15min
  used_at timestamptz
  created_at timestamptz default now()
  index on (token_hash) unique

portal_sessions:
  id uuid pk default gen_random_uuid()
  client_id uuid fk -> clients.id (cascade delete)
  expires_at timestamptz not null    // now()+30d, sliding
  revoked_at timestamptz
  user_agent text, ip inet           // optional, for revoke UI
  created_at timestamptz default now()
  last_seen_at timestamptz
  index on (client_id, expires_at)
```

RLS: both tables `enable row level security`, but **no permissive policy** — only the server (service role + Drizzle direct connection) ever touches them.

**Verify:** migration applies cleanly; Drizzle types compile; `pnpm drizzle-kit check` passes.

---

### Phase 2 — Magic-link issuance (replace Clerk in `inviteClientToPortal`)

**Files**
- `core-pro/lib/services/clients/invite-portal.ts` (rewrite the Clerk call)
- `core-pro/lib/clerk/helpers.ts` — delete `createPortalMagicLink()` and `clearStalePortalUser()` once nothing references them
- `core-pro/lib/portal-auth/issue.ts` (new — `issuePortalMagicLink(clientId)`)
- Resend template: keep current `client-invitation`, just swap the URL

**Behavior**
1. Generate 32-byte random token (`crypto.randomBytes(32).toString('base64url')`).
2. Insert `portal_invites` with `sha256(token)` as `token_hash`, 15-min expiry.
3. Resend email containing `${BASE_URL}/portal/verify?token=<raw>`.
4. Drop the `client.clerk_user_id` write — column stays nullable forever for portal clients.

**Verify:** unit test that `issuePortalMagicLink` writes the hash (not the raw), and that calling `verify` consumes the row exactly once (concurrent calls — second one fails).

---

### Phase 3 — Verify + cookie session

**Files**
- `core-pro/app/portal/verify/route.ts` (new — GET handler)
- `core-pro/lib/portal-auth/session.ts` (new — `createSession`, `readSession`, `revokeSession`, `requirePortalSession`)
- `core-pro/lib/portal-auth/cookie.ts` (new — cookie name, signing, parsing)

**Cookie**
- Name: `nucleus_portal`
- Value: `<sessionId>.<hmac>` (HMAC with `PORTAL_SESSION_SECRET` env var to prevent guessing)
- Flags: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, `Max-Age=30d`

**Verify endpoint flow**
1. Read `?token=`, hash, look up invite.
2. Reject if missing / `used_at != null` / `expires_at < now()`.
3. Mark `used_at = now()`, insert `portal_sessions` row, set cookie, redirect to `/portal`.
4. Errors → `/portal/sign-in?error=expired|invalid` (let the existing portal-sign-in page render the message).

**`requirePortalSession()`** (used by Server Components / Actions):
- Read cookie, verify HMAC, look up session, check expiry.
- Return `{ clientId, professionalId, sessionId }` or `redirect('/portal/sign-in')`.
- Side effect: bump `last_seen_at` (sliding session). Debounce — only update if `last_seen_at` is older than 5 minutes, to avoid one write per page load.

**Verify:** end-to-end manual test — request invite, click email link, land on `/portal`, see same content as before.

---

### Phase 4 — Middleware + portal layout swap

**Files**
- `core-pro/middleware.ts` — keep `clerkMiddleware` for everything **except** `/portal/*`. For portal paths, run our own cookie check before Clerk gets near them.
- `core-pro/app/portal/(authenticated)/layout.tsx` — replace `getCurrentClerkUserId()` with `requirePortalSession()`.
- `core-pro/app/portal/sign-in/portal-sign-in-client.tsx` — rewrite as plain form posting to a server action that calls `issuePortalMagicLink` if the email matches an existing client; else returns generic "if your email is registered…" (don't leak existence).

**Critical:** make sure the route matcher still excludes `/portal/verify` and `/portal/sign-in` from auth, but protects `/portal/(authenticated)/*`.

**Verify:** unauthenticated `/portal` → redirects to `/portal/sign-in`. With cookie → loads. Cookie tampered → redirects.

---

### Phase 5 — Server Actions + Server Components: replace Clerk-derived `clientId`

Audit every portal-side server file for calls like `auth().userId` or `getCurrentClerkUserId()` that resolve to a client. Replace with `requirePortalSession().clientId`.

**Files**
- `app/portal/(authenticated)/page.tsx`
- `app/portal/(authenticated)/messages/page.tsx`
- `app/portal/(authenticated)/forms/page.tsx`
- `app/portal/(authenticated)/forms/[id]/page.tsx`
- `app/portal/(authenticated)/documents/page.tsx`
- `lib/actions/messages.ts` (only the portal-callable actions)
- `lib/actions/forms.ts` (only `submitFormResponseAction`)
- portal document actions (`portalCreateDocumentAction`, `portalPrepareDocumentUploadAction`)

**Drop `withRLS()` for portal-path queries.** Replace with explicit `WHERE client_id = ?` scoping. Keep `withRLS()` for the agent path. This is the cleanest break and makes the trust boundary explicit.

**Verify:** every portal page renders for a fresh portal session; Server Actions for sending a message, submitting a form, uploading a doc all work; no portal code path imports from `@clerk/*`.

---

### Phase 6 — Realtime + Storage: short-lived Supabase JWT

**Files**
- `core-pro/app/api/portal/sb-token/route.ts` (new — POST, returns `{ token, expiresAt }`)
- `core-pro/lib/supabase/portal-jwt.ts` (new — `mintPortalSupabaseJWT(clientId)`)
- `core-pro/lib/supabase/client.ts` — branch the `accessToken` callback: if running inside a portal route, fetch from `/api/portal/sb-token` and cache until ~60s before expiry; else (agent side) fetch Clerk token. Detect via a context provider set by the portal layout.

**JWT shape**
```json
{
  "sub": "client_<uuid>",
  "role": "authenticated",
  "aud": "authenticated",
  "client_id": "<uuid>",
  "professional_id": "<uuid>",
  "exp": <now+1h>
}
```
Signed with `SUPABASE_JWT_SECRET`.

**RLS adjustments** (the only RLS work in this plan):
- `messages`: existing policy reads `auth.jwt() ->> 'sub' = clerk_user_id` on `professional_id`. Add a parallel policy:
  `(auth.jwt() ->> 'client_id')::uuid = messages.client_id` for SELECT/INSERT scoped to `messages.conversation_id` the client owns.
- `storage.objects` (chat-attachments + documents buckets): add a policy granting read/insert when `auth.jwt() ->> 'client_id'` matches a path prefix that includes the client's id. Decide path scheme: `clients/<client_id>/...`.

**Verify:**
- Open `/portal/messages` in two tabs as same client; sending a message in the agent UI shows up live in both portal tabs.
- Upload a file from the portal's chat input — succeeds.
- Test fixture: two clients on different professionals; assert cross-client reads return zero rows. Don't ship without it.

**Risk note:** `mintPortalSupabaseJWT` is the single chokepoint for `SUPABASE_JWT_SECRET`. Never read the secret elsewhere.

---

### Phase 7 — Clean cutover (no users to migrate)

No production client-portal users exist, so no migration script. The cutover is purely code + DB cleanup.

1. After Phase 6 verifies, deploy.
2. Existing `clerk_user_id` values on the `clients` table (if any from internal testing) become orphan data — leave them; the column stays nullable.
3. Manually delete any leftover Clerk test users via the Clerk dashboard.

**Verify:** PostHog `client_portal_invited` events post-deploy show only new-system flows; zero Clerk API calls during portal interactions (network tab inspection).

---

### Phase 8 — Delete Clerk-for-clients code

Only after Phase 7 ships and is stable for ~24 hours.

**Remove**
- `lib/clerk/helpers.ts` — drop `createPortalMagicLink`, `clearStalePortalUser`, and any other portal-only helpers.
- `app/accept-invite/**` — delete the whole route.
- Any leftover `__clerk_ticket` / `__clerk_status` handling.

**Schema cleanup migration (separate phase, after one stable deploy)**
Drop columns from `clients`:
- `clerk_user_id`
- `portal_invite_id`
- `portal_invite_url`
- `portal_invite_sent_at`
- `portal_invite_revoked_at`

Verify nothing reads these before dropping.

---

## Success criteria

A new portal user, end-to-end:

1. Agent opens client → "Send portal invite" → email arrives within 30s.
2. Client clicks link → lands on `/portal` authenticated. Time from click to first paint: < 1s.
3. Client sends a message → agent sees it live (no refresh). Vice versa.
4. Client uploads a doc → it appears in their docs list.
5. Client closes browser, reopens 7 days later, link in their bookmarks: still authenticated.
6. Agent revokes invite → client's session is killed on next request.
7. Zero Clerk API calls observed in network tab during any portal interaction.
8. No `clerk_user_id` writes on the portal codepath.

---

## Risks

- **`SUPABASE_JWT_SECRET` exposure:** lives in env already (Supabase Third-Party Auth uses it). Minting our own JWTs with it means key-handling becomes a new surface. Keep `mintPortalSupabaseJWT` as the single chokepoint.
- **RLS policies are easy to write but hard to test.** Phase 6 needs a test fixture that creates two clients on different professionals and asserts cross-client reads return zero rows.
- **Sliding session writes.** `last_seen_at` updates are a write per page load if not debounced. Plan debounces to >5min staleness threshold.
- **Cookie domain in dev vs prod.** Default scope (host-only) is fine unless subdomains are added. Revisit if preview deploys span domains.

---

## Out of scope (don't expand without approval)

- Agent-side auth changes (Clerk stays).
- Replacing `withRLS()` on the agent path.
- Adding session-management UI for clients (revoke device, list sessions). Add later if needed.
- Multi-factor on the client portal. Magic link is the only factor; this matches the use case (low-privilege, ephemeral access).
- Replacing Resend or the email template.
