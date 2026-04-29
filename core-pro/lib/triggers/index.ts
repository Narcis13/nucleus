// Re-exports task identifiers from `trigger/jobs/*` so dashboard code can
// reference them via `tasks.trigger(taskRef)` with type-safe payloads,
// instead of stringly-typed task IDs.
export type { AppointmentEmailKind } from "@/emails/appointment-reminder"
export { runAutomationChainTask } from "@/trigger/jobs/automation-runner"
export { sendAppointmentReminderTask } from "@/trigger/jobs/appointments"
export { sendCampaignTask } from "@/trigger/jobs/campaigns"
export { inactiveClientCheckerTask } from "@/trigger/jobs/inactive-client-checker"
export { invoiceOverdueSweep } from "@/trigger/jobs/invoices"
