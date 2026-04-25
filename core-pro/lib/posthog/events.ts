import "server-only"

import { captureServerEvent } from "@/lib/posthog/server"

// ─────────────────────────────────────────────────────────────────────────────
// Event catalog — the canonical list of analytics events we emit from the
// server. Keeping them in one file prevents drift between "lib/analytics"
// dashboards and PostHog-side property expectations.
//
// Every event takes a `distinctId` (the Clerk user id of whoever took the
// action, so PostHog funnels line up with the client-side `identify`) plus a
// typed property bag. Keep property values primitive: booleans, numbers, ids,
// plan tier — never free-form strings that might contain PII.
// ─────────────────────────────────────────────────────────────────────────────

export type ProductEvent =
  | "professional_signed_up"
  | "client_added"
  | "client_portal_invited"
  | "client_portal_revoked"
  | "lead_created"
  | "lead_converted"
  | "message_sent"
  | "appointment_created"
  | "form_submitted"
  | "invoice_created"
  | "micro_site_published"
  | "automation_created"
  | "email_campaign_sent"

type BaseProps = {
  distinctId: string
  professionalId?: string | null
  plan?: string | null
}

type EventProps = {
  professional_signed_up: BaseProps & {
    source?: string
  }
  client_added: BaseProps & {
    clientId: string
    invited: boolean
    source?: string | null
  }
  client_portal_invited: BaseProps & {
    clientId: string
  }
  client_portal_revoked: BaseProps & {
    clientId: string
  }
  lead_created: BaseProps & {
    leadId: string
    source?: string | null
  }
  lead_converted: BaseProps & {
    leadId: string
    clientId: string
  }
  message_sent: BaseProps & {
    conversationId: string
    senderRole: "professional" | "client"
    messageType: "text" | "image" | "file"
  }
  appointment_created: BaseProps & {
    appointmentId: string
    origin: "professional" | "public_booking"
    type: "in_person" | "virtual" | "phone"
  }
  form_submitted: BaseProps & {
    formId: string
    assignmentId: string
    clientId: string
  }
  invoice_created: BaseProps & {
    invoiceId: string
    total: number
    currency: string
    status: "draft" | "sent"
  }
  micro_site_published: BaseProps & {
    siteId: string
    slug: string
  }
  automation_created: BaseProps & {
    automationId: string
    triggerType: string
  }
  email_campaign_sent: BaseProps & {
    campaignId: string
    delivered: number
    total: number
  }
}

type PropertiesFor<E extends ProductEvent> = Omit<EventProps[E], "distinctId">

// Fire a typed product event. Swallows errors internally so no caller ever has
// to `.catch(() => {})` at the call site. The `distinctId` must be the Clerk
// user id so server events merge with the browser-side person.
export async function trackServerEvent<E extends ProductEvent>(
  event: E,
  args: { distinctId: string } & PropertiesFor<E>,
): Promise<void> {
  const { distinctId, ...rest } = args
  await captureServerEvent({
    distinctId,
    event,
    properties: rest as Record<string, unknown>,
  })
}
