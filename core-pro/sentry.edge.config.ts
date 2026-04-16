import * as Sentry from "@sentry/nextjs"
import { scrubPii } from "@/lib/sentry/pii-filter"

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    beforeSend: scrubPii,
    debug: false,
  })
}
