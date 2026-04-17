import type { AutomationAction, TriggerType } from "@/lib/automations/types"

// Shape the dashboard passes through props — flattens the Drizzle row into
// JSON-safe primitives the client components can safely rehydrate.
export type AutomationListItem = {
  id: string
  name: string
  triggerType: string
  triggerConfig: unknown
  actions: unknown
  isActive: boolean
  createdAt: string
  runs: number
  lastRunAt: string | null
}

export type AutomationLogItem = {
  id: string
  automationId: string
  status: string | null
  error: string | null
  executedAt: string
}

export type ReferenceData = {
  tags: Array<{ id: string; name: string; color: string | null }>
  forms: Array<{ id: string; title: string }>
  stages: Array<{ id: string; name: string }>
}

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  new_client: "Client added",
  new_lead: "Lead created",
  form_submitted: "Form submitted",
  appointment_completed: "Appointment completed",
  client_inactive: "Client inactive (X days)",
  custom_date: "Recurring schedule",
}

export const TRIGGER_DESCRIPTIONS: Record<TriggerType, string> = {
  new_client: "Runs whenever you add a new client or convert a lead.",
  new_lead: "Runs when a new lead lands from any source.",
  form_submitted: "Runs when a client submits a form you assigned them.",
  appointment_completed: "Runs when a session is marked completed.",
  client_inactive: "Daily scan fires this when a client has had no activity for X days.",
  custom_date: "Runs on a recurring schedule (daily / weekly / monthly).",
}

export const ACTION_LABELS: Record<AutomationAction["type"], string> = {
  send_email: "Send email",
  send_notification: "Send notification to me",
  assign_form: "Assign a form",
  add_tag: "Add tag",
  remove_tag: "Remove tag",
  move_lead_to_stage: "Move lead to stage",
  create_task: "Create reminder for me",
  wait: "Wait",
}

export function summarizeAction(
  action: AutomationAction,
  ref: ReferenceData,
): string {
  switch (action.type) {
    case "send_email":
      return `Email · ${action.templateKey}`
    case "send_notification":
      return `Notify me · ${action.title}`
    case "assign_form": {
      const form = ref.forms.find((f) => f.id === action.formId)
      const name = form?.title ?? "—"
      const due = action.dueDays ? ` · due ${action.dueDays}d` : ""
      return `Form · ${name}${due}`
    }
    case "add_tag": {
      const tag = ref.tags.find((t) => t.id === action.tagId)
      return `Add tag · ${tag?.name ?? "—"}`
    }
    case "remove_tag": {
      const tag = ref.tags.find((t) => t.id === action.tagId)
      return `Remove tag · ${tag?.name ?? "—"}`
    }
    case "move_lead_to_stage": {
      const stage = ref.stages.find((s) => s.id === action.stageId)
      return `Move lead → ${stage?.name ?? "—"}`
    }
    case "create_task":
      return `Reminder · ${action.title}`
    case "wait":
      return `Wait ${action.days} day${action.days === 1 ? "" : "s"}`
  }
}
