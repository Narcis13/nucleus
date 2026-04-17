// Business domain types composed from Drizzle's inferred row types.
// Keep this file UI-friendly: extend selects with computed/joined fields, but
// never re-declare what Drizzle already infers.

import type { InferInsertModel, InferSelectModel } from "drizzle-orm"

import type {
  appointments,
  automationLogs,
  automations,
  availabilitySlots,
  clientSettings,
  clientTags,
  clients,
  conversations,
  documents,
  emailCampaignRecipients,
  emailCampaigns,
  formAssignments,
  formResponses,
  forms,
  invoiceSettings,
  invoices,
  leadActivities,
  leadMagnetDownloads,
  leadMagnets,
  leadStages,
  leads,
  marketingAssets,
  messages,
  microSites,
  notifications,
  paymentReminders,
  professionalClients,
  professionalSettings,
  professionals,
  pushSubscriptions,
  services,
  socialTemplates,
  tags,
} from "@/lib/db/schema"

// ── Core entities ──────────────────────────────────────────────────────────
export type Professional = InferSelectModel<typeof professionals>
export type NewProfessional = InferInsertModel<typeof professionals>

export type Client = InferSelectModel<typeof clients>
export type NewClient = InferInsertModel<typeof clients>

export type ProfessionalClient = InferSelectModel<typeof professionalClients>
export type NewProfessionalClient = InferInsertModel<typeof professionalClients>

export type Tag = InferSelectModel<typeof tags>
export type ClientTag = InferSelectModel<typeof clientTags>

// ── Pipeline ───────────────────────────────────────────────────────────────
export type Lead = InferSelectModel<typeof leads>
export type NewLead = InferInsertModel<typeof leads>
export type LeadStage = InferSelectModel<typeof leadStages>
export type LeadActivity = InferSelectModel<typeof leadActivities>

// ── Services & scheduling ──────────────────────────────────────────────────
export type Service = InferSelectModel<typeof services>
export type NewService = InferInsertModel<typeof services>
export type Appointment = InferSelectModel<typeof appointments>
export type NewAppointment = InferInsertModel<typeof appointments>
export type AvailabilitySlot = InferSelectModel<typeof availabilitySlots>

// ── Messaging ──────────────────────────────────────────────────────────────
export type Conversation = InferSelectModel<typeof conversations>
export type Message = InferSelectModel<typeof messages>
export type NewMessage = InferInsertModel<typeof messages>

// ── Forms ──────────────────────────────────────────────────────────────────
export type Form = InferSelectModel<typeof forms>
export type FormAssignment = InferSelectModel<typeof formAssignments>
export type FormResponse = InferSelectModel<typeof formResponses>

// ── Documents, invoices, automations, marketing, settings ──────────────────
export type Document = InferSelectModel<typeof documents>
export type Invoice = InferSelectModel<typeof invoices>
export type NewInvoice = InferInsertModel<typeof invoices>
export type InvoiceSettings = InferSelectModel<typeof invoiceSettings>
export type NewInvoiceSettings = InferInsertModel<typeof invoiceSettings>
export type PaymentReminder = InferSelectModel<typeof paymentReminders>
export type NewPaymentReminder = InferInsertModel<typeof paymentReminders>

// Shape of a single row inside `invoices.line_items` jsonb.
export type InvoiceLineItem = {
  description: string
  quantity: number
  unit_price: number
  amount: number
}

// Parsed shape of `invoice_settings.company_info` jsonb — loose on purpose so
// the UI can evolve without a migration. All fields optional.
export type InvoiceCompanyInfo = {
  name?: string
  address?: string
  city?: string
  postal_code?: string
  country?: string
  phone?: string
  email?: string
  website?: string
  tax_id?: string
}

export type Automation = InferSelectModel<typeof automations>
export type AutomationLog = InferSelectModel<typeof automationLogs>
export type MicroSite = InferSelectModel<typeof microSites>
export type MarketingAsset = InferSelectModel<typeof marketingAssets>

// ── Marketing kit (session 17) ─────────────────────────────────────────────
export type EmailCampaign = InferSelectModel<typeof emailCampaigns>
export type NewEmailCampaign = InferInsertModel<typeof emailCampaigns>
export type EmailCampaignRecipient = InferSelectModel<
  typeof emailCampaignRecipients
>
export type NewEmailCampaignRecipient = InferInsertModel<
  typeof emailCampaignRecipients
>
export type SocialTemplate = InferSelectModel<typeof socialTemplates>
export type NewSocialTemplate = InferInsertModel<typeof socialTemplates>
export type LeadMagnet = InferSelectModel<typeof leadMagnets>
export type NewLeadMagnet = InferInsertModel<typeof leadMagnets>
export type LeadMagnetDownload = InferSelectModel<typeof leadMagnetDownloads>

// Audience descriptor persisted on `email_campaigns.audience`.
export type EmailCampaignAudience =
  | { type: "all_clients" }
  | { type: "tag"; tagId: string }
  | { type: "status"; status: string }
  | { type: "leads_all" }

// Shape of the hashtags JSON column on social_templates.
export type SocialTemplateHashtags = string[]

// Shape of `social_templates.design` — loose on purpose; the editor adds
// fields over time without needing a migration.
export type SocialTemplateDesign = {
  title?: string
  body?: string
  cta?: string
  author?: string
  primaryColor?: string
  secondaryColor?: string
  textColor?: string
  backgroundStyle?: "solid" | "gradient"
  logoUrl?: string | null
}

export type Notification = InferSelectModel<typeof notifications>
export type NewNotification = InferInsertModel<typeof notifications>
export type PushSubscription = InferSelectModel<typeof pushSubscriptions>
export type NewPushSubscription = InferInsertModel<typeof pushSubscriptions>
export type ProfessionalSettings = InferSelectModel<typeof professionalSettings>
export type ClientSettings = InferSelectModel<typeof clientSettings>

// ─────────────────────────────────────────────────────────────────────────────
// Composed view types — used in lists/details where we want the linked row.
// These don't add fields, they just signal "this query returns the joined shape".
// ─────────────────────────────────────────────────────────────────────────────
export type ClientWithRelationship = Client & {
  relationship: ProfessionalClient
  tags: Tag[]
}

export type LeadWithStage = Lead & {
  stage: LeadStage | null
}

export type ConversationWithLastMessage = Conversation & {
  client: Pick<Client, "id" | "fullName" | "avatarUrl"> | null
  lastMessage: Pick<Message, "id" | "content" | "type" | "createdAt"> | null
  unreadCount: number
}

// Plan limits (parsed shape of `professionals.plan_limits` jsonb).
export type PlanLimits = {
  max_clients: number
  max_storage_mb: number
  features: string[]
}

// Branding (parsed shape of `professionals.branding` jsonb).
export type Branding = {
  primary_color?: string
  secondary_color?: string
  font?: string
  logo_url?: string | null
}

export type UserRole = "professional" | "client" | "admin"

// ─────────────────────────────────────────────────────────────────────────────
// Notification preferences — stored on *_settings.notification_preferences.
// `per_type` and `per_channel` booleans are `true` by default when missing, so
// adding a new notification type doesn't silently suppress it for existing
// users. Quiet hours are interpreted in the recipient's timezone.
// ─────────────────────────────────────────────────────────────────────────────
export type NotificationType =
  | "message"
  | "appointment"
  | "form"
  | "lead"
  | "invoice"
  | "invoice_reminder"
  | "invoice_paid"
  | "document"
  | "system"

export type NotificationChannel = "in_app" | "email" | "push"

export type QuietHours = {
  enabled: boolean
  start: string // "HH:MM" local time
  end: string // "HH:MM" local time
}

export type NotificationPreferences = {
  per_type?: Partial<Record<NotificationType, boolean>>
  per_channel?: Partial<Record<NotificationChannel, boolean>>
  quiet_hours?: QuietHours
}

// ─────────────────────────────────────────────────────────────────────────────
// Professional settings payloads — each lives on a jsonb column of
// professional_settings. We keep shapes loose so adding a field doesn't
// require a migration; callers should always merge-patch rather than replace.
// ─────────────────────────────────────────────────────────────────────────────
export type CalendarSync = {
  timezone?: string
  google_calendar_sync_url?: string | null
  ical_subscription_enabled?: boolean
}

export type IntegrationsConfig = {
  zoom?: {
    enabled: boolean
    account_email?: string
  }
  google_meet?: {
    enabled: boolean
    account_email?: string
  }
}

export type GdprSettings = {
  retention_days?: number
  auto_delete_inactive?: boolean
  dpo_email?: string | null
  privacy_policy_url?: string | null
}

export type ConsentType =
  | "marketing_emails"
  | "data_sharing"
  | "analytics"
  | "processing"

export type ConsentRecord = {
  consent: ConsentType
  granted: boolean
  recordedAt: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Micro-site configuration — parsed shape of `micro_sites.sections` jsonb.
//
// Every published site is rendered from `order` (which section slots appear,
// and in what sequence) + `config` (per-section content) + `branding`. Unknown
// keys are preserved by the builder so a future niche section can add data
// without migrating existing rows.
// ─────────────────────────────────────────────────────────────────────────────
export const MICRO_SITE_SECTION_TYPES = [
  "hero",
  "about",
  "services",
  "testimonials",
  "contact",
  "faq",
  "blog",
  "niche",
] as const

export type MicroSiteSectionType = (typeof MICRO_SITE_SECTION_TYPES)[number]

export type MicroSiteTheme =
  | "default"
  | "modern"
  | "warm"
  | "minimal"
  | "bold"

export type MicroSiteBranding = {
  primary_color?: string
  secondary_color?: string
  accent_color?: string
  logo_url?: string | null
  cover_url?: string | null
  tagline?: string
}

export type MicroSiteHeroSection = {
  enabled: boolean
  headline?: string
  subheadline?: string
  cta_label?: string
  cta_target?: "contact" | "services" | "custom"
  cta_href?: string
}

export type MicroSiteAboutSection = {
  enabled: boolean
  title?: string
  body?: string
  certifications?: string[]
  experience_years?: number | null
}

export type MicroSiteServicesSection = {
  enabled: boolean
  title?: string
  intro?: string
  show_pricing?: boolean
}

export type MicroSiteTestimonial = {
  id: string
  author: string
  role?: string
  content: string
  rating?: number
}

export type MicroSiteTestimonialsSection = {
  enabled: boolean
  title?: string
  items: MicroSiteTestimonial[]
}

export type MicroSiteContactSection = {
  enabled: boolean
  title?: string
  intro?: string
  email?: string
  phone?: string
}

export type MicroSiteFaqItem = {
  id: string
  question: string
  answer: string
}

export type MicroSiteFaqSection = {
  enabled: boolean
  title?: string
  items: MicroSiteFaqItem[]
}

export type MicroSitePlaceholderSection = {
  enabled: boolean
  title?: string
  body?: string
}

export type MicroSiteSectionConfig = {
  hero: MicroSiteHeroSection
  about: MicroSiteAboutSection
  services: MicroSiteServicesSection
  testimonials: MicroSiteTestimonialsSection
  contact: MicroSiteContactSection
  faq: MicroSiteFaqSection
  blog: MicroSitePlaceholderSection
  niche: MicroSitePlaceholderSection
}

export type MicroSiteConfig = {
  order: MicroSiteSectionType[]
  sections: MicroSiteSectionConfig
  branding: MicroSiteBranding
}

export type MicroSiteSocialLinks = {
  instagram?: string
  facebook?: string
  linkedin?: string
  twitter?: string
  youtube?: string
  tiktok?: string
  website?: string
}
