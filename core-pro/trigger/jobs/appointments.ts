import { task } from "@trigger.dev/sdk"

import { sendAppointmentEmails } from "@/lib/scheduling/notifications"
import type { AppointmentEmailKind } from "@/emails/appointment-reminder"

// ─────────────────────────────────────────────────────────────────────────────
// Trigger.dev v4 — appointment reminder dispatcher.
//
// Scheduled by `scheduleAppointmentReminders()` whenever an appointment is
// created or rescheduled. Two delays per appointment (24h + 1h before start)
// each post a single trigger.run with a `delay` option, then this task fires
// when the delay expires and forwards to the shared email sender.
//
// Idempotent at the email-template level — re-running for the same id
// re-sends, which is safer than missing a reminder.
// ─────────────────────────────────────────────────────────────────────────────
export const sendAppointmentReminderTask = task({
  id: "appointments.send-reminder",
  retry: { maxAttempts: 3 },
  run: async (payload: {
    appointmentId: string
    kind: AppointmentEmailKind
  }) => {
    await sendAppointmentEmails({
      appointmentId: payload.appointmentId,
      kind: payload.kind,
    })
    return { ok: true }
  },
})
