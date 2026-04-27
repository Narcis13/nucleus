import "server-only"

import type { ReactElement } from "react"

import { makeEmailTranslator } from "@/lib/resend/translator"
import AppointmentConfirmationEmail, {
  type AppointmentConfirmationEmailProps,
} from "@/emails/appointment-confirmation"
import AppointmentReminderEmail, {
  type AppointmentEmailProps,
} from "@/emails/appointment-reminder"
import ClientInvitationEmail, {
  type ClientInvitationEmailProps,
} from "@/emails/client-invitation"
import FormAssignedEmail, {
  type FormAssignedEmailProps,
} from "@/emails/form-assigned"
import GdprExportEmail, {
  type GdprExportEmailProps,
} from "@/emails/gdpr-export"
import InvoiceReminderEmail, {
  type InvoiceReminderEmailProps,
} from "@/emails/invoice-reminder"
import InvoiceSentEmail, {
  type InvoiceSentEmailProps,
} from "@/emails/invoice-sent"
import LeadMagnetClaimEmail, {
  type LeadMagnetClaimEmailProps,
} from "@/emails/lead-magnet-claim"
import LeadNotificationEmail, {
  type LeadNotificationEmailProps,
} from "@/emails/lead-notification"
import NewMessageEmail, {
  type NewMessageEmailProps,
} from "@/emails/new-message"
import WeeklySummaryEmail, {
  type WeeklySummaryEmailProps,
} from "@/emails/weekly-summary"
import WelcomeEmail, { type WelcomeEmailProps } from "@/emails/welcome"

// ─────────────────────────────────────────────────────────────────────────────
// Template registry — single source of truth for every transactional email we
// send. Each entry maps an id → React component + a `subject` builder.
//
// `EmailTemplateId` is derived from this object so callers + the preview route
// + tests all stay in lockstep when a template is added.
//
// Subjects live here (not in each component) so the preview route + the send
// path use the exact same line. Components only render the body.
// ─────────────────────────────────────────────────────────────────────────────

export type EmailTemplateMap = {
  welcome: WelcomeEmailProps
  "client-invitation": ClientInvitationEmailProps
  "appointment-confirmation": AppointmentConfirmationEmailProps
  "appointment-reminder": AppointmentEmailProps
  "new-message": NewMessageEmailProps
  "form-assigned": FormAssignedEmailProps
  "lead-notification": LeadNotificationEmailProps
  "lead-magnet-claim": LeadMagnetClaimEmailProps
  "invoice-sent": InvoiceSentEmailProps
  "invoice-reminder": InvoiceReminderEmailProps
  "weekly-summary": WeeklySummaryEmailProps
  "gdpr-export": GdprExportEmailProps
}

export type EmailTemplateId = keyof EmailTemplateMap

type TemplateEntry<K extends EmailTemplateId> = {
  render: (data: EmailTemplateMap[K]) => ReactElement
  subject: (data: EmailTemplateMap[K]) => string
}

type Registry = { [K in EmailTemplateId]: TemplateEntry<K> }

export const TEMPLATES: Registry = {
  welcome: {
    render: (d) => WelcomeEmail(d),
    subject: (d) =>
      makeEmailTranslator(d.locale)("emails.welcome.subject", {
        workspace: d.professionalName,
      }),
  },
  "client-invitation": {
    render: (d) => ClientInvitationEmail(d),
    subject: (d) =>
      makeEmailTranslator(d.locale)("emails.clientInvitation.subject", {
        sender: d.professionalName,
      }),
  },
  "appointment-confirmation": {
    render: (d) => AppointmentConfirmationEmail(d),
    subject: (d) =>
      makeEmailTranslator(d.locale)("emails.appointmentConfirmation.subject", {
        title: d.title,
        date: new Date(d.startAtIso).toISOString().slice(0, 10),
      }),
  },
  "appointment-reminder": {
    render: (d) => AppointmentReminderEmail(d),
    subject: (d) => {
      const t = makeEmailTranslator(d.locale)
      const date = new Date(d.startAtIso).toISOString().slice(0, 10)
      switch (d.kind) {
        case "confirmation":
          return t("emails.appointmentConfirmation.subject", {
            title: d.title,
            date,
          })
        default:
          return t("emails.appointmentReminder.subject", {
            title: d.title,
            date,
          })
      }
    },
  },
  "new-message": {
    render: (d) => NewMessageEmail(d),
    subject: (d) =>
      makeEmailTranslator(d.locale)("emails.newMessage.subject", {
        sender: d.senderName,
      }),
  },
  "form-assigned": {
    render: (d) => FormAssignedEmail(d),
    subject: (d) =>
      makeEmailTranslator(d.locale)("emails.formAssigned.subject", {
        formTitle: d.formTitle,
      }),
  },
  "lead-notification": {
    render: (d) => LeadNotificationEmail(d),
    subject: (d) =>
      makeEmailTranslator(d.locale)("emails.leadNotification.subject", {
        name: d.leadName,
      }),
  },
  "lead-magnet-claim": {
    render: (d) => LeadMagnetClaimEmail(d),
    // Plain English subject — no translation key yet (the body uses a fixed
    // copy too). When we add `emails.leadMagnetClaim.*` keys this can switch.
    subject: (d) => `Confirm your download — ${d.magnetTitle}`,
  },
  "invoice-sent": {
    render: (d) => InvoiceSentEmail(d),
    subject: (d) =>
      makeEmailTranslator(d.locale)("emails.invoiceSent.subject", {
        number: d.invoiceNumber,
      }),
  },
  "invoice-reminder": {
    render: (d) => InvoiceReminderEmail(d),
    subject: (d) =>
      makeEmailTranslator(d.locale)("emails.invoiceReminder.subject", {
        number: d.invoiceNumber,
      }),
  },
  "weekly-summary": {
    render: (d) => WeeklySummaryEmail(d),
    subject: (d) => makeEmailTranslator(d.locale)("emails.weeklySummary.subject"),
  },
  "gdpr-export": {
    render: (d) => GdprExportEmail(d),
    subject: (d) => makeEmailTranslator(d.locale)("emails.gdprExport.subject"),
  },
}

export const EMAIL_TEMPLATE_IDS = Object.keys(TEMPLATES) as EmailTemplateId[]

export function isEmailTemplateId(id: string): id is EmailTemplateId {
  return id in TEMPLATES
}
