import { sql } from "drizzle-orm"
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { anonRole, authenticatedRole } from "drizzle-orm/supabase"

import { createdAt, currentProfessionalIdSql, updatedAt } from "./_helpers"
import { professionals } from "./professionals"

// Postgres `bytea` mapped to Node Buffer — used for sha256(token) so the raw
// magic-link token never lives at rest. Same pattern as `portal_invites`.
const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea"
  },
})

// ============================================================================
// EMAIL CAMPAIGNS
//
// A campaign is the professional's outbound blast (welcome email, newsletter,
// promo). The payload is serialized into `subject` + `bodyHtml` at send time;
// merge tags ({{client_name}} etc.) are expanded per-recipient when the
// `sendCampaignAction` fans out to Resend.
//
// Per-recipient delivery state lives on `email_campaign_recipients` so we can
// display open/click rates sourced from Resend webhook events.
// ============================================================================
export const emailCampaigns = pgTable(
  "email_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    templateKey: text("template_key").notNull(),
    subject: text("subject").notNull(),
    bodyHtml: text("body_html").notNull(),
    // Segment descriptor — {type: "all" | "tag" | "status", value?: string}.
    // Resolved at send time; we don't snapshot recipient ids until send so
    // newly-added clients can still be caught by a draft.
    audience: jsonb("audience").notNull(),
    status: text("status").default("draft").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    sentCount: integer("sent_count").default(0).notNull(),
    openedCount: integer("opened_count").default(0).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("email_campaigns_professional_id_idx").on(t.professionalId),
    index("email_campaigns_status_idx").on(t.professionalId, t.status),

    pgPolicy("email_campaigns_professional_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
      withCheck: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
    }),
  ],
)

export const emailCampaignRecipients = pgTable(
  "email_campaign_recipients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => emailCampaigns.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    fullName: text("full_name"),
    // Link back to the client row when the recipient came from a segment.
    // Nullable because campaigns can target leads / ad-hoc lists too.
    clientId: uuid("client_id"),
    status: text("status").default("queued").notNull(),
    resendMessageId: text("resend_message_id"),
    error: text("error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("email_campaign_recipients_campaign_id_idx").on(t.campaignId),

    pgPolicy("email_campaign_recipients_professional_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.campaignId} in (select id from public.email_campaigns where professional_id = ${currentProfessionalIdSql})`,
      withCheck: sql`${t.campaignId} in (select id from public.email_campaigns where professional_id = ${currentProfessionalIdSql})`,
    }),
  ],
)

// ============================================================================
// SOCIAL TEMPLATES — pre-built layouts the professional customizes with text
// and brand colors. Exported to PNG client-side via a canvas renderer, so the
// row only needs to persist the design JSON + a suggested caption.
// ============================================================================
export const socialTemplates = pgTable(
  "social_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    layout: text("layout").notNull(),
    // "instagram_square" | "instagram_story" | "linkedin_post" | "twitter_post"
    platform: text("platform").notNull(),
    design: jsonb("design").notNull(),
    caption: text("caption"),
    hashtags: jsonb("hashtags"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("social_templates_professional_id_idx").on(t.professionalId),

    pgPolicy("social_templates_professional_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
      withCheck: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
    }),
  ],
)

// ============================================================================
// LEAD MAGNETS — gated downloads surfaced on the micro-site. The contact form
// on the public site triggers `requestLeadMagnetAction`, which creates a lead
// (so the download becomes a pipeline entry) and returns a signed URL.
// ============================================================================
export const leadMagnets = pgTable(
  "lead_magnets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    // Storage key inside the public `marketing` bucket:
    // `<professional_id>/lead-magnets/<uuid>-<filename>`
    fileKey: text("file_key").notNull(),
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size").default(0).notNull(),
    isPublished: boolean("is_published").default(true).notNull(),
    downloadCount: integer("download_count").default(0).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("lead_magnets_professional_id_idx").on(t.professionalId),

    pgPolicy("lead_magnets_professional_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
      withCheck: sql`${t.professionalId} = ${currentProfessionalIdSql}`,
    }),
    // Published magnets are readable by the anon micro-site.
    pgPolicy("lead_magnets_public_select", {
      for: "select",
      to: [anonRole, authenticatedRole],
      using: sql`${t.isPublished} = true`,
    }),
  ],
)

export const leadMagnetDownloads = pgTable(
  "lead_magnet_downloads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadMagnetId: uuid("lead_magnet_id")
      .notNull()
      .references(() => leadMagnets.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    fullName: text("full_name"),
    phone: text("phone"),
    leadId: uuid("lead_id"),
    createdAt: createdAt(),
  },
  (t) => [
    index("lead_magnet_downloads_magnet_idx").on(t.leadMagnetId),

    pgPolicy("lead_magnet_downloads_professional_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.leadMagnetId} in (select id from public.lead_magnets where professional_id = ${currentProfessionalIdSql})`,
      withCheck: sql`${t.leadMagnetId} in (select id from public.lead_magnets where professional_id = ${currentProfessionalIdSql})`,
    }),
    // Anon micro-site visitors log a download before any auth exists. The
    // WITH CHECK pins the insert to a *published* lead magnet so random IDs
    // can't be used to seed garbage rows.
    pgPolicy("lead_magnet_downloads_public_insert", {
      for: "insert",
      to: [anonRole, authenticatedRole],
      withCheck: sql`${t.leadMagnetId} in (select id from public.lead_magnets where is_published = true)`,
    }),
  ],
)

// ============================================================================
// LEAD_MAGNET_CLAIMS — single-use magic-link tickets that double-opt-in the
// visitor's email before the PDF is delivered. The form submit inserts a row
// here (not a lead), an email goes out with `/m/claim/<token>`, and the
// claim route atomically consumes the row to mint the lead + signed URL.
//
// Why a separate table (vs. extending lead_magnet_downloads): downloads only
// represent successful completions; claims represent intent and stay around
// until expiry (or claim) for auditability + retry safety. Same hash-only
// token storage pattern as `portal_invites`.
//
// RLS: enabled, no permissive policy. Only the server (dbAdmin) reads/writes.
// ============================================================================
export const leadMagnetClaims = pgTable(
  "lead_magnet_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadMagnetId: uuid("lead_magnet_id")
      .notNull()
      .references(() => leadMagnets.id, { onDelete: "cascade" }),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    // Captured at request time, replayed at claim time.
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    phone: text("phone"),
    slug: text("slug").notNull(),
    tokenHash: bytea("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    // Filled in when the claim is consumed and a lead row is minted.
    leadId: uuid("lead_id"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("lead_magnet_claims_token_hash_idx").on(t.tokenHash),
    index("lead_magnet_claims_magnet_idx").on(t.leadMagnetId),
  ],
).enableRLS()
