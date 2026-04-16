-- Enable Postgres extensions needed across the schema.
-- Runs before any Drizzle-generated migration.

create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "pgcrypto" with schema extensions;
