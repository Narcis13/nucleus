# Niche extension playbook

CorePro is a boilerplate. Real products (FitCorePro for trainers,
EstateCorePro for agents, …) are **forks** that layer niche-specific
routes, tables, and UI on top of the core. This guide is the contract
between the core and those forks.

## Extension points

Three folders are reserved, one on each side of the auth boundary:

| Folder | Audience | What lives here |
| --- | --- | --- |
| `app/dashboard/_niche/` | Signed-in professional | Dashboard modules (e.g. `workouts/`, `listings/`) |
| `app/portal/_niche/` | Signed-in client | Portal pages (e.g. `my-plan/`) |
| `app/[slug]/_niche/` | Public (anonymous) | Micro-site sections (e.g. `showings/`) |

The core **never** imports from a `_niche/` folder. That one rule is the
contract; everything else follows from it.

## Adding a niche module — step-by-step

### 1. Plan the surface

Pick the routes you need, on each side of the auth boundary. For
FitCorePro, a minimal set is:

- `app/dashboard/_niche/workouts/` — build + assign workouts
- `app/portal/_niche/my-workouts/` — the client-facing view
- `app/[slug]/_niche/classes/` — public class listings (optional)

### 2. Schema

Prefix every niche table with the niche short name (e.g. `fit_workouts`,
`fit_workout_sets`). Keep foreign keys into core tables
(`professionals.id`, `clients.id`) and add RLS policies that delegate to
the core helpers:

```sql
CREATE TABLE fit_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  -- niche-specific columns…
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE fit_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY fit_workouts_pro_select ON fit_workouts
  FOR SELECT USING (professional_id = app_current_professional_id());

CREATE POLICY fit_workouts_pro_write ON fit_workouts
  FOR ALL USING (professional_id = app_current_professional_id())
  WITH CHECK (professional_id = app_current_professional_id());

CREATE POLICY fit_workouts_client_read ON fit_workouts
  FOR SELECT USING (client_id = app_current_client_id());
```

Use `app_current_professional_id()` and `app_current_client_id()`
(declared in `20260418120000_fix_clients_rls_recursion.sql`) to avoid
RLS recursion.

Extend the Drizzle schema in `lib/db/schema/` with a matching file
`fit-workouts.ts` and re-export from `lib/db/schema.ts`.

### 3. Queries + actions

- Add a queries module under `lib/db/queries/fit/workouts.ts` that
  uses `withRLS` for every read.
- Add a server-actions module under `lib/actions/fit/workouts.ts`
  that uses `authedAction`. Always pass `metadata.actionName` as a
  namespaced string (`"fit.workouts.create"`) so log tags and rate-limit
  keys are collide-free.

### 4. Pages + navigation

Drop the route files into the relevant `_niche/` folder:

```
app/dashboard/_niche/workouts/
├── page.tsx
├── new/page.tsx
└── [id]/page.tsx
```

Register the new entry in `components/dashboard/nav-items.ts` by
replacing the `NICHE_NAV` array with your module's entries:

```ts
export const NICHE_NAV: NavItem[] = [
  {
    labelKey: "fit.workouts",
    fallbackLabel: "Workouts",
    href: "/dashboard/_niche/workouts",
    icon: Dumbbell,
  },
]
```

Add matching strings to `messages/en.json` (`dashboard.nav.fit.workouts`)
and each supported locale.

### 5. Client portal

Mirror the surface in `app/portal/_niche/`. Keep the portal read-only
when possible — the portal is the client's view of work the professional
did, not an authoring surface.

### 6. Public micro-site

If your niche needs a public surface (class listings, a listings grid,
an open-gym schedule, …), add a section in `app/[slug]/_niche/`. Wire it
into the micro-site's section renderer by extending
`components/micro-site/theme.ts` and the section switch in
`app/[slug]/page.tsx`.

### 7. Plan limits + feature flags

If the niche unlocks a new tier (or meters a new resource), add the
counter to `lib/stripe/usage.ts` and surface it via
`lib/stripe/plans.ts`. Use the existing `PlanLimits` shape so the
billing page automatically renders the new row.

### 8. Tests

At minimum, author a Playwright spec for the dashboard surface under
`tests/e2e/niche/fit-workouts.spec.ts`. Use the professional storage
state; seed data via a separate fixture so the test remains idempotent.

## Conventions

- **Naming**: prefix every niche-exclusive table, type, event, and
  route with the niche short name (`fit_`, `estate_`, …). That stops a
  second niche fork from colliding with the first.
- **Imports**: a `_niche/` file can import from the core. The core
  **must not** import from `_niche/`. Enforce with a lint rule or a
  code review convention — nothing automated stops you today.
- **i18n**: new strings live under `messages/<locale>.json` in a
  namespaced block (`"fit": { "workouts": { … } }`).
- **RLS**: every niche table gets policies scoped by
  `app_current_professional_id()` and, if client-readable,
  `app_current_client_id()`. Don't write policies that reference the
  underlying professionals/clients tables directly — you'll bring the
  recursion back.
- **Events**: PostHog event names stay snake_case and carry a
  `niche` tag so the core funnels can still slice by niche.

## Anti-patterns

- **Don't fork the core files.** If you find yourself editing
  `components/dashboard/sidebar.tsx`, `lib/db/rls.ts`, or any
  core table migration to make a niche thing work, the core has a
  bug — fix it upstream instead.
- **Don't rename the `_niche/` folders.** Keeping the name stable
  lets multiple forks share the same upgrade path.
- **Don't reuse a core table for niche-only columns.** Add a
  sibling table and join. Our RLS policies are narrow for a reason.
- **Don't write niche-specific messages into the core English
  bundle.** A fresh fork inherits every string in `messages/en.json`;
  orphaned keys look like dead code.

## Upstream merges

When you pull changes from the boilerplate into a niche fork, expect
merges to be near-trivial in `_niche/` (because the core never
touches it) and straightforward elsewhere (because you stuck to the
conventions above). If you've diverged the core for niche reasons,
split the change into a PR back to the boilerplate first.

## When in doubt

The rule of thumb: **is this universal?** If yes, it lives in the
core. If not, it lives in `_niche/`. Keep the boundary sharp and the
boilerplate stays useful forever.
