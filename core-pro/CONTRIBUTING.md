# Contributing to CorePro

Short guide to the conventions baked into the boilerplate. Read
`AGENTS.md` (and `CLAUDE.md`, which extends it) before changing
framework-facing code — **Next.js 16 is not the Next.js you know.** The App
Router, typed routes, and the `proxy.ts` middleware file all differ from
older training data.

## Prerequisites

- Node 20+
- npm 10+
- Everything else is documented in the README.

## Branch / commit flow

- Work against `main`. Feature branches are `feat/<short-name>`, bug
  fixes `fix/<short-name>`, migrations `chore/migration-<slug>`.
- Keep commits small and descriptive; commit messages explain the
  **why**, not the **what**. The diff already tells you what changed.
- Do not skip hooks (`--no-verify`) or `--no-gpg-sign` unless the user
  explicitly asks — fix the underlying issue instead.
- Do not force-push `main`.

## Style + conventions

### TypeScript / React

- Components and functions are `PascalCase`; variables and helpers are
  `camelCase`. Reserve `SCREAMING_SNAKE` for constants and enum-like
  lists (`PLAN_ORDER`, `NAV_ITEMS`).
- **Server Components by default.** Only add `"use client"` when a
  component genuinely needs state, effects, or browser APIs. Prefer
  composing server components that render a tiny client island over
  marking large subtrees as client.
- Use `authedAction` / `publicAction` from `lib/actions/safe-action.ts`
  for every mutation. Throw `ActionError` for user-safe messages; any
  other error becomes the default "Something went wrong" string and is
  reported to Sentry.
- All DB reads go through `withRLS` (`lib/db/rls.ts`). The `dbAdmin`
  client is reserved for webhooks + cross-user admin work — never touch
  it from a user-driven handler.
- Use `next-safe-action`'s `useAction` hook for client-side mutations
  so success / error / pending states stay consistent.
- Prefer `toast.success()` / `toast.error()` from `sonner` for user
  feedback. The `<Toaster />` is mounted once in the root layout.
- Use `EmptyState` + `PageHeader` from `components/shared/page-header`
  on every list page. Lists should handle the empty case explicitly,
  not rely on "zero cards" looking like an empty state.

### Base UI buttons with `render`

When a Base UI `Button` is rendered as something other than a native
`<button>` (e.g. an `<a>` or a `next/link` Link), pair the `render` prop
with `nativeButton={false}`:

```tsx
<Button
  nativeButton={false}
  render={<Link href="/dashboard" />}
>
  Open dashboard
</Button>
```

Our wrapper in `components/ui/button.tsx` infers this automatically for
most cases, but being explicit avoids surprises.

### Tailwind / design tokens

- Colors and radii are tokenized. Use `bg-background`, `text-foreground`,
  `bg-primary`, etc. — never hard-code hex values outside of email
  templates (those must be email-safe) and micro-site themes (which use
  scoped CSS variables).
- Professional branding overrides `--primary`, `--ring`, `--accent`, and
  `--font-sans` via inline CSS variables on a wrapper. Read
  `var(--primary)`, don't depend on the theme directly.
- Spacing: prefer the Tailwind scale (`gap-3`, `p-4`, `space-y-2`)
  rather than pixel values.

### Forms

- Zod schemas live inline with the action that consumes them. Zod errors
  become the automatic validation errors on the client via
  `next-safe-action`.
- Client input never goes through `dangerouslySetInnerHTML`. The only
  accepted use is server-rendered JSON-LD structured data that we
  construct ourselves.
- Public forms (contact form, booking widget) must honeypot AND rate
  limit. `publicFormRateLimit` in `lib/ratelimit/index.ts` is the
  shared limiter (3/min per IP+slug).

### Database

- Schema in `lib/db/schema.ts` (Drizzle). Migrations land under
  `supabase/migrations/` and are applied in timestamp order.
- Every user-facing table **must** have an RLS policy. When policies
  reference other user-scoped tables, use the `app_current_*_id()`
  SECURITY DEFINER helpers to avoid recursion.
- Always serialize `Date` with `.toISOString()` before interpolating
  into a raw `sql\`...\`` template. Drizzle's typed operators serialize
  automatically, but raw templates do not.

### Clerk

- `useAuth().getToken()` is browser-only — guard with
  `typeof window !== "undefined"` when calling from a hook that may
  run during SSR.
- Webhook handlers must return 2xx fast; heavy work goes to Trigger.dev
  jobs so Svix doesn't retry.

### Supabase Realtime

- Channel names must be unique per mount. Append
  `crypto.randomUUID()` to the channel name — React 19 strict-mode
  double-mount can otherwise collide with async `removeChannel`.

## Accessibility

- Every interactive element must be keyboard reachable. Icon-only
  buttons need an `aria-label`.
- Dialogs (Base UI) trap focus automatically; don't disable the
  auto-close behavior unless you're replacing it with something that
  also returns focus to the trigger.
- Use the `sr-only` utility for close-button labels and other visually
  hidden text.
- Color contrast must meet WCAG 2.1 AA in both light and dark themes.
  Our tokens are tuned for this; don't override text colors ad-hoc.

## Testing

- Unit / integration: co-locate tests with code when practical.
- E2E lives in `tests/e2e/*.spec.ts`. Specs assume the pre-captured
  professional storage state (`tests/.auth/professional.json`). To
  exercise a signed-out path, override `test.use({ storageState: {
  cookies: [], origins: [] } })` in the describe block.
- Playwright runs the dev server itself by default — set
  `E2E_SKIP_SERVER=1` if you're pointing at an already-running instance.

## Observability

- Wrap risky async work with a `try/catch` and forward to
  `captureException` (`lib/sentry`) with useful tags.
- Server actions automatically report via the base client's
  `handleServerError` — no need to duplicate.
- Feature usage → PostHog (`trackServerEvent`). Keep event names in
  snake_case, properties camelCase.

## Niche extension points

The three `_niche/` folders (`app/dashboard/_niche/`,
`app/portal/_niche/`, `app/[slug]/_niche/`) are reserved for
specialized forks of this boilerplate. Never import from them in
shared code. See `docs/niche-extension.md` for the full playbook.

## Pull request checklist

Before opening a PR:

- [ ] `npm run lint` is clean
- [ ] `npm run typecheck` is clean
- [ ] `npm run build` succeeds (no warnings)
- [ ] `npm run test` passes (or the failing specs are documented)
- [ ] Env vars touched are reflected in `.env.local.example` and
      `lib/env.ts`
- [ ] New user-facing strings live under `messages/en.json` +
      `messages/ro.json`
- [ ] DB changes come with a migration under `supabase/migrations/`
      and an RLS policy where relevant

Thanks for keeping the boilerplate sharp.
