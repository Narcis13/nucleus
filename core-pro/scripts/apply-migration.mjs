// One-shot helper to apply a single SQL file via the project's `postgres`
// client. Used when a hand-written migration needs to land without the local
// `psql` binary available. Usage: `node scripts/apply-migration.mjs <path>`.
// Run with: `node --env-file=.env.local scripts/apply-migration.mjs <sql>`.
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import postgres from "postgres"

const file = process.argv[2]
if (!file) {
  console.error("usage: node scripts/apply-migration.mjs <path-to-sql>")
  process.exit(1)
}

const url = process.env.DATABASE_URL_SERVICE_ROLE ?? process.env.DATABASE_URL
if (!url) {
  console.error("DATABASE_URL not set")
  process.exit(1)
}

const sql = readFileSync(resolve(file), "utf8")
const client = postgres(url, { max: 1, prepare: false })

try {
  await client.unsafe(sql)
  console.log(`applied: ${file}`)
} catch (err) {
  console.error("migration failed:", err)
  process.exitCode = 1
} finally {
  await client.end({ timeout: 5 })
}
