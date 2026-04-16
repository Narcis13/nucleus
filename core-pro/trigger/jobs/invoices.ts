import { schedules } from "@trigger.dev/sdk"

import { runOverdueChecker } from "@/lib/invoices/overdue-checker"

// ─────────────────────────────────────────────────────────────────────────────
// Trigger.dev v4 — daily invoice dunning sweep.
//
// Runs once a day at 09:00 UTC. Does two things in one pass: flip any
// `sent`/`viewed` invoices past their due date into `overdue`, then walk all
// open overdue invoices and dispatch the appropriate reminder email (friendly
// → firm → final) if that tier hasn't already been sent.
//
// Idempotent at the audit-log level: `payment_reminders` is the source of
// truth for what was sent when, so re-running on the same day is a no-op.
// ─────────────────────────────────────────────────────────────────────────────
export const invoiceOverdueSweep = schedules.task({
  id: "invoices.overdue-sweep",
  cron: "0 9 * * *",
  run: async () => {
    const report = await runOverdueChecker()
    return report
  },
})
