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
  formAssignments,
  formResponses,
  forms,
  invoices,
  leadActivities,
  leadStages,
  leads,
  marketingAssets,
  messages,
  microSites,
  notifications,
  professionalClients,
  professionalSettings,
  professionals,
  pushSubscriptions,
  services,
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
export type Automation = InferSelectModel<typeof automations>
export type AutomationLog = InferSelectModel<typeof automationLogs>
export type MicroSite = InferSelectModel<typeof microSites>
export type MarketingAsset = InferSelectModel<typeof marketingAssets>
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
  logo_url?: string
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
