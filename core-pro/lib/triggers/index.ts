// Re-exports task identifiers from `trigger/jobs/*` so dashboard code can
// reference them via `tasks.trigger("...")` without importing the implementation
// modules (which depend on Trigger.dev runtime helpers).
export type { AppointmentEmailKind } from "@/emails/appointment-reminder"
