import "server-only"

import { dbAdmin } from "@/lib/db/client"
import { errorLogs } from "@/lib/db/schema"

// ─────────────────────────────────────────────────────────────────────────────
// Structured error sink (post-Sentry).
//
// Writes to the `error_logs` table via the service-role connection so RLS does
// not interfere. The DB write is fire-and-forget: callers do not await it and
// any failure falls back to console.error so the original error path keeps
// running. This is intentionally a thin shim — verticals can later drain the
// table to Logtail / Vercel log drains without touching callsites.
// ─────────────────────────────────────────────────────────────────────────────

type Level = "error" | "warn" | "info"

export type LogOptions = {
  /** Stable identifier for the call site, e.g. `action:createClient`. */
  source: string
  /** Optional override; defaults to error.message or the literal `message`. */
  message?: string
  professionalId?: string | null
  clientId?: string | null
  /** Free-form context — request id, payload keys, etc. Not user input. */
  metadata?: Record<string, unknown>
}

function extractMessage(err: unknown, fallback?: string): string {
  if (typeof err === "string") return err
  if (err instanceof Error && err.message) return err.message
  if (fallback) return fallback
  try {
    return JSON.stringify(err)
  } catch {
    return "Unknown error"
  }
}

function extractStack(err: unknown): string | null {
  if (err instanceof Error && err.stack) return err.stack
  return null
}

async function write(level: Level, err: unknown, opts: LogOptions): Promise<void> {
  const message = extractMessage(err, opts.message)
  const stack = extractStack(err)
  try {
    await dbAdmin.insert(errorLogs).values({
      level,
      source: opts.source,
      message,
      stack,
      professionalId: opts.professionalId ?? null,
      clientId: opts.clientId ?? null,
      metadata: opts.metadata ?? null,
    })
  } catch (sinkErr) {
    // The sink itself failed — fall back to console so we don't lose the
    // signal entirely. Log both the original error and the sink failure.
    console.error(`[audit:${opts.source}] sink write failed`, sinkErr)
    console.error(`[audit:${opts.source}] original`, err)
  }
}

/**
 * Record a server-side error to the structured sink. Fire-and-forget: the
 * promise is captured by the runtime via `void` so the caller's flow is not
 * delayed; failures fall back to console.error.
 */
export function logError(err: unknown, opts: LogOptions): void {
  void write("error", err, opts)
}

/** Same shape as logError, lower severity. */
export function logWarn(err: unknown, opts: LogOptions): void {
  void write("warn", err, opts)
}
