import type { ErrorEvent } from "@sentry/nextjs"

/**
 * Patterns that match PII we want to scrub from Sentry events.
 * Matches email addresses, phone numbers (various formats), and
 * replaces them with redacted placeholders.
 */
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const PHONE_RE =
  /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g

/** Keys whose values should be fully redacted when found in event extras/contexts. */
const SENSITIVE_KEYS = new Set([
  "email",
  "phone",
  "phone_number",
  "phoneNumber",
  "client_name",
  "clientName",
  "full_name",
  "fullName",
  "first_name",
  "firstName",
  "last_name",
  "lastName",
])

function scrubString(value: string): string {
  return value
    .replace(EMAIL_RE, "[email redacted]")
    .replace(PHONE_RE, "[phone redacted]")
}

function scrubObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key)) {
      result[key] = "[redacted]"
    } else if (typeof value === "string") {
      result[key] = scrubString(value)
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = scrubObject(value as Record<string, unknown>)
    } else {
      result[key] = value
    }
  }
  return result
}

/**
 * Sentry `beforeSend` hook that strips PII (emails, phone numbers,
 * client names) from error event payloads before they leave the browser
 * or server.
 */
export function scrubPii(event: ErrorEvent): ErrorEvent | null {
  // Scrub exception messages
  if (event.exception?.values) {
    for (const ex of event.exception.values) {
      if (ex.value) {
        ex.value = scrubString(ex.value)
      }
    }
  }

  // Scrub breadcrumb messages
  if (event.breadcrumbs) {
    for (const bc of event.breadcrumbs) {
      if (bc.message) {
        bc.message = scrubString(bc.message)
      }
      if (bc.data && typeof bc.data === "object") {
        bc.data = scrubObject(bc.data as Record<string, unknown>)
      }
    }
  }

  // Scrub extra context
  if (event.extra && typeof event.extra === "object") {
    event.extra = scrubObject(event.extra as Record<string, unknown>)
  }

  // Scrub contexts
  if (event.contexts && typeof event.contexts === "object") {
    for (const [ctxKey, ctxVal] of Object.entries(event.contexts)) {
      if (ctxVal && typeof ctxVal === "object") {
        event.contexts[ctxKey] = scrubObject(
          ctxVal as Record<string, unknown>,
        ) as typeof ctxVal
      }
    }
  }

  // Scrub tags
  if (event.tags) {
    for (const [key, value] of Object.entries(event.tags)) {
      if (SENSITIVE_KEYS.has(key)) {
        event.tags[key] = "[redacted]"
      } else if (typeof value === "string") {
        event.tags[key] = scrubString(value)
      }
    }
  }

  // Never send user email/ip to Sentry
  if (event.user) {
    delete event.user.email
    delete event.user.ip_address
    // Keep user.id for correlation
  }

  return event
}
