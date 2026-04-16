# Development Hints

Working notes on how we run this project during development. Add to this doc whenever a workflow decision is made so future sessions don't have to re-derive it.

---

## Supabase (Remote Database)

We use a **single remote Supabase project** (ref: `rtyaxedmtjybjxscfglw`) as the development database. No local Supabase stack. All schema changes go through migration files committed to git and applied to the remote.

### Source of truth

- **Schema** → `core-pro/lib/db/schema/*.ts` (Drizzle). This is what you edit.
- **Migrations** → `core-pro/supabase/migrations/*.sql`. Generated from Drizzle + hand-written SQL. Committed to git.
- **Applied state** → tracked in the remote by `supabase_migrations.schema_migrations`.

### Migration file conventions

Files are applied in **filename (alphabetical) order** by `supabase db push`. We use numeric prefixes to control ordering around the Drizzle-generated file:

| Prefix | Purpose |
|---|---|
| `0000_` – `0099_` | Pre-Drizzle setup: extensions, base functions, roles |
| `<timestamp>_` | Drizzle-generated schema migrations (tables, columns, indexes) |
| `9900_` – `9999_` | Post-Drizzle wiring: storage buckets, storage policies, realtime, triggers, RLS policies that reference tables |

Do **not** put RLS policies or anything that references a table inside the `00xx_` range — those files run before tables exist.

### Changing the schema — the loop

1. Edit the Drizzle schema in `core-pro/lib/db/schema/*.ts`.
2. Generate a migration:
   ```bash
   cd core-pro && npm run db:generate
   ```
   Drizzle writes a new `<timestamp>_<name>.sql` into `supabase/migrations/` and updates `meta/_journal.json`.
3. Review the generated SQL. Edit by hand if needed (e.g., add `USING` clauses for non-null backfills). If the change touches storage / realtime / triggers, add or modify a `9900+` file instead of the Drizzle output.
4. Apply to the remote:
   ```bash
   cd core-pro && npx supabase db push
   ```
   Prompts for the DB password. Only pushes migrations not already in `schema_migrations`.
5. Commit both `supabase/migrations/*.sql` and `supabase/migrations/meta/_journal.json` in the same commit.

### Never use `drizzle-kit push`

`npm run db:push` (drizzle-kit push) writes directly to the database without creating a migration file. That breaks the filename-ordering contract with the hand-written `0000_` / `9900_` files, and leaves the remote in a state that no teammate can reproduce. Always go through `db:generate` → `supabase db push`.

`npm run db:migrate` (drizzle-kit migrate) is also off-limits for the same reason — it only sees Drizzle's journal and skips the non-Drizzle SQL files.

### Seeding

`core-pro/supabase/seed.sql` is **not** run by `supabase db push`. To seed the remote, apply it manually:

```bash
cd core-pro && psql "$DATABASE_URL" -f supabase/seed.sql
```

Keep `seed.sql` idempotent (`ON CONFLICT DO NOTHING`, `IF NOT EXISTS`) so reruns are safe.

### Connection strings

- `DATABASE_URL` in `.env.local` points to the **pooler** (`aws-0-eu-west-1.pooler.supabase.com:6543`, transaction mode). Use this for app runtime (Drizzle queries in Server Components / Actions).
- `supabase db push` talks to the direct connection itself; you don't need a separate URL for it.
- For one-off `psql` / `drizzle-kit studio`, the pooler URL works.

### If a migration fails mid-push

`supabase db push` is not transactional across files. A failure leaves some migrations applied and the rest not. Recovery:

1. Read the error, fix the offending SQL file.
2. Check what's actually in the remote: `psql "$DATABASE_URL" -c "select version from supabase_migrations.schema_migrations order by version;"`
3. If the failed migration partially ran, manually `DROP` whatever it created, then re-run `supabase db push`.

Do **not** delete rows from `schema_migrations` without also reverting the schema — they'll drift and the next push will try to re-apply and fail on "already exists".

### Resetting the remote (destructive)

There is no safe one-button reset for a shared remote. If you truly need a clean slate during early development, do it via the Supabase dashboard (Settings → Database → Reset database) and then run `supabase db push` again. Confirm with the team first — this wipes all data.
