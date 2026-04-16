import type { FormSchema } from "@/types/forms"

// Pre-built form schemas. Copied into a new `forms` row on "Use template" —
// templates themselves are never edited or assigned directly.
export type FormTemplate = {
  key: string
  title: string
  description: string
  schema: FormSchema
}

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    key: "gdpr-consent",
    title: "GDPR Consent",
    description: "Record a client's explicit consent to process personal data.",
    schema: {
      version: 1,
      submitLabel: "I consent",
      fields: [
        {
          id: "intro",
          type: "section",
          label: "Data processing consent",
          description:
            "Your answers are stored securely. You can withdraw consent at any time.",
        },
        {
          id: "data_processing",
          type: "single_select",
          label: "I consent to the processing of my personal data",
          required: true,
          options: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ],
        },
        {
          id: "marketing",
          type: "single_select",
          label: "I would like to receive occasional marketing emails",
          required: true,
          options: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ],
        },
        {
          id: "signature",
          type: "signature",
          label: "Signature",
          required: true,
        },
        {
          id: "signed_on",
          type: "date",
          label: "Date",
          required: true,
        },
      ],
    },
  },
  {
    key: "general-intake",
    title: "General Intake",
    description: "Collect contact info, goals, and background from a new client.",
    schema: {
      version: 1,
      fields: [
        {
          id: "intro",
          type: "section",
          label: "About you",
          description: "A few quick questions so we can prepare for our first session.",
        },
        {
          id: "full_name",
          type: "short_text",
          label: "Full name",
          required: true,
          placeholder: "Jane Doe",
        },
        {
          id: "email",
          type: "email",
          label: "Email",
          required: true,
        },
        {
          id: "phone",
          type: "phone",
          label: "Phone",
        },
        {
          id: "dob",
          type: "date",
          label: "Date of birth",
        },
        {
          id: "goals",
          type: "long_text",
          label: "What are you hoping to achieve?",
          required: true,
          placeholder: "Tell us a little about your goals…",
        },
        {
          id: "notes",
          type: "long_text",
          label: "Anything else we should know?",
        },
      ],
    },
  },
  {
    key: "nps-survey",
    title: "Satisfaction Survey (NPS)",
    description: "Net Promoter Score + open feedback.",
    schema: {
      version: 1,
      fields: [
        {
          id: "score",
          type: "slider",
          label:
            "How likely are you to recommend us to a friend or colleague?",
          required: true,
          min: 0,
          max: 10,
          step: 1,
        },
        {
          id: "reason",
          type: "long_text",
          label: "What's the main reason for your score?",
        },
        {
          id: "improvements",
          type: "long_text",
          label: "What could we do better?",
        },
      ],
    },
  },
  {
    key: "weekly-checkin",
    title: "Weekly Check-in",
    description: "A lightweight recurring check-in for progress tracking.",
    schema: {
      version: 1,
      fields: [
        {
          id: "mood",
          type: "slider",
          label: "How are you feeling this week?",
          required: true,
          min: 1,
          max: 10,
          step: 1,
        },
        {
          id: "highlights",
          type: "long_text",
          label: "Highlights of the week",
        },
        {
          id: "struggles",
          type: "long_text",
          label: "Any struggles or blockers?",
        },
        {
          id: "focus",
          type: "long_text",
          label: "What will you focus on next week?",
        },
      ],
    },
  },
]

export function getTemplate(key: string): FormTemplate | null {
  return FORM_TEMPLATES.find((t) => t.key === key) ?? null
}
