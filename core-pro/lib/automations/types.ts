// ─────────────────────────────────────────────────────────────────────────────
// Shape of an automation as stored in `automations.trigger_config` / `actions`
// jsonb columns. Parsed once at the engine boundary and trusted downstream.
//
// Kept in a shared module so the authoring UI, the engine, and the Trigger.dev
// task all agree on the same discriminated union without each re-declaring it.
// ─────────────────────────────────────────────────────────────────────────────

export const TRIGGER_TYPES = [
  "new_client",
  "new_lead",
  "form_submitted",
  "appointment_completed",
  "client_inactive",
  "custom_date",
] as const

export type TriggerType = (typeof TRIGGER_TYPES)[number]

// Optional conditions that filter which targets actually fire an automation
// once its trigger type matches. Every field is optional; a missing field
// means "no restriction on that dimension".
export type AutomationConditions = {
  tagIds?: string[]
  planTier?: string | null
  clientStatus?: string | null
  formId?: string | null
  leadSource?: string | null
}

// Per-trigger config. Extra fields live here instead of on the automation row
// itself so each trigger type can evolve independently.
export type TriggerConfig = {
  conditions?: AutomationConditions
  // Inactivity threshold (days) used by the `client_inactive` daily checker.
  inactiveDays?: number
  // Cron-ish schedule for `custom_date`. MVP ships with "weekly" / "daily".
  schedule?: "daily" | "weekly" | "monthly"
}

// Every action the engine knows how to execute. A `wait` step is modelled as
// a first-class action so chains read top-to-bottom in the authoring UI.
export type AutomationAction =
  | { type: "send_email"; templateKey: string; subject?: string | null }
  | { type: "send_notification"; title: string; body?: string | null }
  | { type: "assign_form"; formId: string; dueDays?: number | null }
  | { type: "add_tag"; tagId: string }
  | { type: "remove_tag"; tagId: string }
  | { type: "move_lead_to_stage"; stageId: string }
  | { type: "create_task"; title: string; body?: string | null }
  | { type: "wait"; days: number }

export type AutomationActionType = AutomationAction["type"]

// Payload handed to `evaluateTrigger` — the caller always knows the
// professional whose event fired it plus either a client or lead id so the
// engine can fetch details as needed.
export type TriggerPayload =
  | {
      type: "new_client"
      professionalId: string
      clientId: string
    }
  | {
      type: "new_lead"
      professionalId: string
      leadId: string
    }
  | {
      type: "form_submitted"
      professionalId: string
      clientId: string | null
      formId: string
      assignmentId: string
    }
  | {
      type: "appointment_completed"
      professionalId: string
      clientId: string | null
      appointmentId: string
    }
  | {
      type: "client_inactive"
      professionalId: string
      clientId: string
      daysInactive: number
    }
  | {
      type: "custom_date"
      professionalId: string
      clientId: string
      schedule: "daily" | "weekly" | "monthly"
    }

// Context handed to each action execution. Fields are optional because not
// every trigger fills every slot (a lead trigger has no clientId, etc.).
export type ActionContext = {
  professionalId: string
  clientId?: string | null
  leadId?: string | null
  formId?: string | null
  appointmentId?: string | null
  // Original payload is kept around so templated copy ("form X was submitted")
  // can read anything it needs without a refetch.
  triggerPayload?: TriggerPayload
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-built automation templates surfaced in the builder. These are shapes the
// UI copies into a new automation — not runtime artefacts.
// ─────────────────────────────────────────────────────────────────────────────
export type AutomationTemplateKey =
  | "welcome_sequence"
  | "lead_nurture"
  | "re_engagement"
  | "weekly_checkin"
