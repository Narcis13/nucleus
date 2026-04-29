import "server-only"

import {
  getRemindersForInvoice,
  logReminder,
  sweepOverdueInvoices,
} from "@/lib/db/queries/invoices"
import { sendReminderEmail } from "@/lib/invoices/emails"

// ─────────────────────────────────────────────────────────────────────────────
// Daily dunning sweep.
//
// 1. Flip `sent` / `viewed` invoices whose due date has passed into `overdue`.
// 2. For each overdue invoice, pick the reminder tier (friendly / firm / final)
//    based on days-overdue thresholds — but only if that exact tier hasn't
//    already been dispatched for this invoice (the `payment_reminders` audit
//    table makes that idempotent).
// 3. Send the email + log the send.
//
// Runs from:
//   · The Trigger.dev schedule in `trigger/jobs/invoices.ts`
//   · The catch-up cron endpoint at `app/api/cron/invoices-overdue/route.ts`
//
// Thresholds are fixed: 1 day → friendly, 7 days → firm, 14+ days → final.
// ─────────────────────────────────────────────────────────────────────────────

export type ReminderTier = "friendly" | "firm" | "final"

function tierFor(daysOverdue: number): ReminderTier | null {
  if (daysOverdue >= 14) return "final"
  if (daysOverdue >= 7) return "firm"
  if (daysOverdue >= 1) return "friendly"
  return null
}

export type SweepReport = {
  flippedCount: number
  remindersSent: number
  remindersSkipped: number
}

export async function runOverdueChecker(): Promise<SweepReport> {
  const result = await sweepOverdueInvoices()
  let remindersSent = 0
  let remindersSkipped = 0

  for (const item of result.items) {
    const tier = tierFor(item.daysOverdue)
    if (!tier) continue

    try {
      // Avoid re-sending the same tier for the same invoice — the audit table
      // is the source of truth. If a higher tier has already been sent we
      // still send the current one only if the *specific* tier is new.
      const past = await getRemindersForInvoice(item.invoice.id)
      const alreadySentThisTier = past.some((r) => r.reminderType === tier)
      if (alreadySentThisTier) {
        remindersSkipped += 1
        continue
      }

      const { sent } = await sendReminderEmail({
        invoiceId: item.invoice.id,
        tier,
        daysOverdue: item.daysOverdue,
      })
      if (sent) {
        await logReminder({
          invoiceId: item.invoice.id,
          professionalId: item.invoice.professionalId,
          reminderType: tier,
          daysOverdue: item.daysOverdue,
        })
        remindersSent += 1
      } else {
        remindersSkipped += 1
      }
    } catch (err) {
      console.error(err, {
        tags: { invoice_overdue_checker: "reminder" },
        extra: { invoiceId: item.invoice.id },
      })
      remindersSkipped += 1
    }
  }

  return {
    flippedCount: result.flipped,
    remindersSent,
    remindersSkipped,
  }
}
