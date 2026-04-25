
# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Surface tradeoffs. Default to action — ask only when stakes are high.**

Bias toward proceeding with the recommended approach **~85% of the time**. Stop and ask only when the cost of guessing wrong is high: destructive ops, irreversible architecture choices, security/auth changes, or ambiguous business intent that affects user-facing behavior.

Before implementing:
- State your assumptions explicitly in one line, then proceed with the recommended approach. Don't open a Q&A round for every decision.
- If multiple interpretations exist, pick the most likely one, name it briefly, and proceed. Only halt if the wrong pick is costly to undo.
- If a simpler approach exists, use it and say so — don't ask for permission to simplify.
- If something is genuinely unclear *and* high-stakes, stop and ask. For low-stakes ambiguity, make the call and note it.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

# Project Context (Durable)

These facts outlive any single session and apply to every contributor. Verify against current code before citing as fact — point-in-time observations drift.

## Active path — `core-pro/` Next.js 15.5 (decided 2026-04-25)

**`core-pro/` on Next.js 15.5 LTS is the production path.** The earlier Rails rebuild plan (`docs/Nucleus-Rails-Implementation-Plan-v1.0.md`, `nucleus-rails-spike/`) is **paused** — read those for context if needed, but no new Rails sessions and no porting work back. New product work lands in `core-pro/`.

**Why this stack, in this order of priority:**
1. **Stability** — no canary, no alpha SDKs, no "let's try the new thing." Pin LTS / latest stable.
2. **Speed of iteration** — favor what the team already knows over what's theoretically better. Boring tech wins.
3. **Cutting-edge tech is explicitly not a goal.** If a feature only exists on Next canary, the answer is "we wait" or "we work around it," not "let's upgrade."

**Removed — do not reintroduce without an explicit ask:**
- **Sentry** — fully removed (SDK, `instrumentation.ts` hooks, `sentry.*.config.ts`, env vars). Errors go through native logging. Don't add `@sentry/nextjs` back.
- **Next 16** — downgraded to 15.5 LTS. Don't bump back; the RSC rapid-refresh race (see memory `feedback_next16_rsc_rapid_refresh.md`) is why.

**Active stack (verify against `core-pro/package.json` before citing as fact):**
- Next.js **15.5 LTS**, middleware in `middleware.ts` (NOT `proxy.ts` — that was a Next 16 artifact)
- React 19, Clerk Organizations, Supabase RLS via Clerk Third-Party Auth (`accessToken` callback — not the deprecated JWT-template flow)
- Drizzle ORM (schema in `lib/db/schema/`, migrations in `supabase/migrations/`)
- `next-safe-action` for Server Actions, Trigger.dev v4, Stripe v22, `zod@4` (with `zod/mini` in client bundles)
- `@dnd-kit`, `@react-pdf/renderer`, Base UI

**How to apply:**
- Default new work to `core-pro/` and the existing patterns. Don't propose framework swaps or "while we're here, let's modernize X."
- For dep upgrades: prefer the latest **stable** version, not bleeding-edge. Read the changelog for breaking changes before bumping majors.
- If a request seems to need a cutting-edge feature, propose a stable workaround first.

