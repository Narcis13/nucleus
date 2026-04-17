import type {
  AutomationAction,
  AutomationTemplateKey,
  TriggerConfig,
  TriggerType,
} from "./types"

// ─────────────────────────────────────────────────────────────────────────────
// Pre-built automation templates used as starting points in the builder.
// Mirrors the four shapes called out in the session spec:
//   · Welcome sequence    — new client → email → 3d → form
//   · Lead nurture        — new lead   → email → 3d → follow-up → 7d → offer
//   · Re-engagement       — inactive 30d → email → 14d → in-app notification
//   · Weekly check-in     — schedule    → assign form
//
// Form/template keys left blank are filled in by the UI when the pro picks
// the concrete form / email template before saving.
// ─────────────────────────────────────────────────────────────────────────────
export type AutomationTemplate = {
  key: AutomationTemplateKey
  name: string
  description: string
  triggerType: TriggerType
  triggerConfig: TriggerConfig
  actions: AutomationAction[]
}

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    key: "welcome_sequence",
    name: "Welcome sequence",
    description: "Greet new clients, then nudge them to fill an intake form.",
    triggerType: "new_client",
    triggerConfig: {},
    actions: [
      { type: "send_email", templateKey: "welcome_sequence_day1" },
      { type: "wait", days: 3 },
      { type: "assign_form", formId: "", dueDays: 7 },
    ],
  },
  {
    key: "lead_nurture",
    name: "Lead nurture",
    description: "Email new leads, follow up 3 days later, offer 7 days in.",
    triggerType: "new_lead",
    triggerConfig: {},
    actions: [
      { type: "send_email", templateKey: "welcome_sequence_day1" },
      { type: "wait", days: 3 },
      { type: "send_email", templateKey: "welcome_sequence_day3" },
      { type: "wait", days: 7 },
      { type: "send_email", templateKey: "promotion" },
    ],
  },
  {
    key: "re_engagement",
    name: "Re-engagement",
    description: "When a client goes quiet for 30 days, reach out.",
    triggerType: "client_inactive",
    triggerConfig: { inactiveDays: 30 },
    actions: [
      { type: "send_email", templateKey: "re_engagement" },
      { type: "wait", days: 14 },
      {
        type: "send_notification",
        title: "Client still inactive",
        body: "No activity two weeks after the re-engagement email. Consider calling.",
      },
    ],
  },
  {
    key: "weekly_checkin",
    name: "Weekly check-in",
    description: "Send every active client a short form once a week.",
    triggerType: "custom_date",
    triggerConfig: { schedule: "weekly" },
    actions: [{ type: "assign_form", formId: "", dueDays: 3 }],
  },
]

export function getAutomationTemplate(
  key: string,
): AutomationTemplate | null {
  return AUTOMATION_TEMPLATES.find((t) => t.key === key) ?? null
}
