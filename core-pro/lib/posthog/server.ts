import "server-only"

import { PostHog } from "posthog-node"

import { logError } from "@/lib/audit/log"
import { env } from "@/lib/env"

// Lazy singleton so webhook / action handlers share a single PostHog client
// across the lifetime of the Node process. In serverless environments (Vercel
// Functions) the process is short-lived, so we always `shutdown` after every
// fire to flush in-flight events before the runtime freezes.
let _client: PostHog | null = null

export function getPostHogServer(): PostHog | null {
  if (!env.NEXT_PUBLIC_POSTHOG_KEY) return null
  if (_client) return _client
  _client = new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY, {
    host: env.NEXT_PUBLIC_POSTHOG_HOST,
    // Flush quickly — actions are short-lived and we'd rather pay per-request
    // than risk dropped events on an unexpected process kill.
    flushAt: 1,
    flushInterval: 0,
  })
  return _client
}

export type ServerEventProperties = Record<string, unknown>

// Fire-and-forget capture. Never throws — instrumentation must not break the
// action/webhook it runs inside. Failures land in `error_logs`.
export async function captureServerEvent(args: {
  distinctId: string
  event: string
  properties?: ServerEventProperties
  groups?: Record<string, string>
}): Promise<void> {
  const client = getPostHogServer()
  if (!client) return
  try {
    client.capture({
      distinctId: args.distinctId,
      event: args.event,
      properties: args.properties,
      groups: args.groups,
    })
    // Ensure delivery before the Lambda freezes. `shutdown` flushes and
    // resolves; safe to call repeatedly thanks to the singleton reset below.
    await client.shutdown()
    _client = null
  } catch (err) {
    logError(err, {
      source: "posthog:capture",
      metadata: { event: args.event, distinctId: args.distinctId },
    })
  }
}

// Server-side identify — used after sign-up / onboarding to enrich the user
// profile with plan, role, and org membership. Does not send PII (email, name);
// those live in Clerk and would bloat the PostHog person row.
export async function identifyServer(args: {
  distinctId: string
  properties?: ServerEventProperties
}): Promise<void> {
  const client = getPostHogServer()
  if (!client) return
  try {
    client.identify({
      distinctId: args.distinctId,
      properties: args.properties,
    })
    await client.shutdown()
    _client = null
  } catch (err) {
    logError(err, {
      source: "posthog:identify",
      metadata: { distinctId: args.distinctId },
    })
  }
}
