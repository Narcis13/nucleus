import "server-only"

import type { Branding } from "@/types/domain"

import type { EmailTemplateId, EmailTemplateMap } from "./templates"

// ─────────────────────────────────────────────────────────────────────────────
// Sample fixture data per template. Used by the preview route to render emails
// in the browser without needing real DB rows. Kept in one file so adding a
// new template forces the author to also describe what "good preview data"
// looks like — otherwise the preview UI silently shows nothing.
//
// `customise(brand)` lets the preview route splice in the *current*
// professional's branding so what they see is what their clients receive.
// ─────────────────────────────────────────────────────────────────────────────

export type FixtureBrand = {
  professionalName: string
  branding: Branding | null
  appUrl: string
  unsubscribeUrl?: string | null
}

type FixtureMap = {
  [K in EmailTemplateId]: (brand: FixtureBrand) => EmailTemplateMap[K]
}

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export const SAMPLE_FIXTURES: FixtureMap = {
  welcome: (brand) => ({
    ...brand,
    recipientName: "Alex Popescu",
    dashboardUrl: `${brand.appUrl}/dashboard`,
  }),
  "client-invitation": (brand) => ({
    ...brand,
    recipientName: "Maria Ionescu",
    inviteUrl: `${brand.appUrl}/portal/verify?token=sample-token`,
    expiresInDays: 7,
    customMessage: "Looking forward to working with you. Let me know if you have any questions before our first session.",
  }),
  "appointment-confirmation": (brand) => ({
    ...brand,
    recipientName: "Maria Ionescu",
    recipientRole: "client",
    clientName: "Maria Ionescu",
    title: "Initial consultation",
    startAtIso: new Date(Date.now() + 2 * DAY).toISOString(),
    endAtIso: new Date(Date.now() + 2 * DAY + HOUR).toISOString(),
    location: "Strada Exemplului 12, Bucharest",
    notes: "Please bring any prior medical records you'd like to discuss.",
  }),
  "appointment-reminder": (brand) => ({
    ...brand,
    kind: "reminder_24h",
    recipientName: "Maria Ionescu",
    recipientRole: "client",
    clientName: "Maria Ionescu",
    title: "Follow-up session",
    startAtIso: new Date(Date.now() + DAY).toISOString(),
    endAtIso: new Date(Date.now() + DAY + HOUR).toISOString(),
    location: "Online (Zoom link in portal)",
    notes: null,
  }),
  "new-message": (brand) => ({
    ...brand,
    recipientName: "Maria Ionescu",
    senderName: brand.professionalName,
    preview:
      "Hi Maria, I've reviewed the form you submitted and have a few thoughts. Let's discuss at our next session.",
    threadUrl: `${brand.appUrl}/portal/messages/sample-thread`,
  }),
  "form-assigned": (brand) => ({
    ...brand,
    recipientName: "Maria Ionescu",
    formTitle: "Pre-session intake questionnaire",
    dueAtIso: new Date(Date.now() + 3 * DAY).toISOString(),
    formUrl: `${brand.appUrl}/portal/forms/sample-form`,
  }),
  "lead-notification": (brand) => ({
    ...brand,
    recipientName: brand.professionalName,
    leadName: "Andrei Stoica",
    leadEmail: "andrei.stoica@example.com",
    leadPhone: "+40 712 345 678",
    source: "Micro-site contact form",
    message:
      "Hi, I'd like to know more about your nutrition packages — specifically whether you offer remote consultations.",
    leadUrl: `${brand.appUrl}/dashboard/leads/sample-lead`,
    capturedAtIso: new Date(Date.now() - HOUR).toISOString(),
  }),
  "lead-magnet-claim": (brand) => ({
    ...brand,
    recipientName: "Andrei Stoica",
    magnetTitle: "Your free real-estate buyer's checklist",
    claimUrl: `${brand.appUrl}/m/claim/sample-token`,
    expiresInMinutes: 30,
  }),
  "invoice-sent": (brand) => ({
    ...brand,
    invoiceNumber: "INV-2026-0042",
    recipientName: "Maria Ionescu",
    lineItems: [
      {
        description: "Initial consultation (60 min)",
        quantity: 1,
        unit_price: 200,
        amount: 200,
      },
      {
        description: "Personalised plan",
        quantity: 1,
        unit_price: 150,
        amount: 150,
      },
    ],
    subtotal: 350,
    taxAmount: 66.5,
    discount: 0,
    total: 416.5,
    paidAmount: 0,
    balanceDue: 416.5,
    currency: "RON",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 14 * DAY).toISOString().slice(0, 10),
    terms: "Net 14",
    notes: null,
    paymentMethod: null,
    paymentReference: null,
    portalUrl: `${brand.appUrl}/portal/invoices/sample-invoice`,
  }),
  "invoice-reminder": (brand) => ({
    ...brand,
    tier: "friendly",
    invoiceNumber: "INV-2026-0042",
    recipientName: "Maria Ionescu",
    lineItems: [
      {
        description: "Initial consultation (60 min)",
        quantity: 1,
        unit_price: 200,
        amount: 200,
      },
    ],
    subtotal: 200,
    taxAmount: 38,
    discount: 0,
    total: 238,
    paidAmount: 0,
    balanceDue: 238,
    currency: "RON",
    issueDate: new Date(Date.now() - 21 * DAY).toISOString().slice(0, 10),
    dueDate: new Date(Date.now() - 7 * DAY).toISOString().slice(0, 10),
    daysOverdue: 7,
    terms: "Net 14",
    notes: null,
    paymentMethod: null,
    paymentReference: null,
    portalUrl: `${brand.appUrl}/portal/invoices/sample-invoice`,
  }),
  "weekly-summary": (brand) => ({
    ...brand,
    recipientName: brand.professionalName,
    weekStartIso: new Date(Date.now() - 7 * DAY).toISOString(),
    weekEndIso: new Date(Date.now() - 1 * DAY).toISOString(),
    appointmentsCompleted: 12,
    appointmentsUpcoming: 9,
    newLeads: 4,
    newClients: 2,
    messagesReceived: 27,
    invoicedAmount: 1850,
    collectedAmount: 1200,
    outstandingAmount: 650,
    currency: "RON",
    topClient: { name: "Maria Ionescu", sessions: 3 },
    dashboardUrl: `${brand.appUrl}/dashboard`,
  }),
  "gdpr-export": (brand) => ({
    ...brand,
    recipientName: "Maria Ionescu",
    downloadUrl: `${brand.appUrl}/api/gdpr/download/sample-token`,
    expiresAtIso: new Date(Date.now() + 7 * DAY).toISOString(),
    fileSizeBytes: 1_456_789,
    requestedAtIso: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  }),
}

export function fixtureFor<K extends EmailTemplateId>(
  id: K,
  brand: FixtureBrand,
): EmailTemplateMap[K] {
  return SAMPLE_FIXTURES[id](brand)
}
