"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { authedAction } from "@/lib/actions/safe-action"
import { deleteAccount } from "@/lib/services/settings/delete-account"
import { inviteTeamMember } from "@/lib/services/settings/invite-team-member"
import { prepareAvatarUpload } from "@/lib/services/settings/prepare-avatar-upload"
import { prepareLogoUpload } from "@/lib/services/settings/prepare-logo-upload"
import { removeTeamMember } from "@/lib/services/settings/remove-team-member"
import { setAvatarUrl } from "@/lib/services/settings/set-avatar-url"
import { updateBranding } from "@/lib/services/settings/update-branding"
import { updateCalendarSync } from "@/lib/services/settings/update-calendar-sync"
import { updateClientConsent } from "@/lib/services/settings/update-client-consent"
import { updateGdprSettings } from "@/lib/services/settings/update-gdpr-settings"
import { updateIntegrations } from "@/lib/services/settings/update-integrations"
import { updateProfile } from "@/lib/services/settings/update-profile"

// ─────────────────────────────────────────────────────────────────────────────
// Settings actions — profile, branding, calendar, integrations, GDPR, team,
// and the danger-zone delete-account flow. All live here (instead of scattered
// across a dozen files) because they mutate the same small set of rows and
// share identical auth/ratelimit/revalidate shapes.
// ─────────────────────────────────────────────────────────────────────────────

// Every setting-change touches multiple surfaces — the dashboard shell, portal,
// and any published micro-site. Revalidate the common ones in one helper so no
// action forgets to invalidate a stale render.
function revalidateSettingsSurfaces() {
  revalidatePath("/dashboard", "layout")
  revalidatePath("/portal", "layout")
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile
// ─────────────────────────────────────────────────────────────────────────────
const profileSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(200),
  bio: z.string().max(2000).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  specialization: z.array(z.string().min(1).max(120)).max(20).optional(),
  certifications: z.array(z.string().min(1).max(200)).max(30).optional(),
  timezone: z.string().max(80).optional(),
  locale: z.string().max(10).optional(),
  currency: z.string().max(10).optional(),
})

export const updateProfileAction = authedAction
  .metadata({ actionName: "settings.updateProfile" })
  .inputSchema(profileSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await updateProfile(ctx, parsedInput)
    revalidateSettingsSurfaces()
    revalidatePath("/dashboard/settings/profile")
    return result
  })

const prepareAvatarUploadSchema = z.object({
  filename: z.string().min(1).max(300),
  contentType: z
    .string()
    .regex(/^image\/(png|jpeg|jpg|webp|gif)$/i, "Only images are allowed"),
  fileSize: z.number().int().positive().max(5 * 1024 * 1024),
})

// Mint a storage key for the avatar upload. The browser does the actual upload
// through the Clerk-authed Supabase client (avatars policy lets it write to
// its own folder). We just return the key and bucket so the client knows
// where to put the file.
export const prepareAvatarUploadAction = authedAction
  .metadata({ actionName: "settings.prepareAvatarUpload" })
  .inputSchema(prepareAvatarUploadSchema)
  .action(async ({ parsedInput, ctx }) => {
    return prepareAvatarUpload(ctx, parsedInput)
  })

// Swap the avatarUrl on the professional row. Called after the browser uploads
// the file so the row points at the new public URL.
export const setAvatarUrlAction = authedAction
  .metadata({ actionName: "settings.setAvatarUrl" })
  .inputSchema(z.object({ avatarUrl: z.string().url().nullable() }))
  .action(async ({ parsedInput, ctx }) => {
    const result = await setAvatarUrl(ctx, parsedInput)
    revalidateSettingsSurfaces()
    revalidatePath("/dashboard/settings/profile")
    return result
  })

// ─────────────────────────────────────────────────────────────────────────────
// Branding
// ─────────────────────────────────────────────────────────────────────────────
const brandingSchema = z.object({
  primary_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a #RRGGBB hex colour")
    .optional(),
  secondary_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a #RRGGBB hex colour")
    .optional(),
  font: z.string().max(120).optional(),
  logo_url: z.string().url().nullable().optional(),
})

export const updateBrandingAction = authedAction
  .metadata({ actionName: "settings.updateBranding" })
  .inputSchema(brandingSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await updateBranding(ctx, parsedInput)
    revalidateSettingsSurfaces()
    revalidatePath("/dashboard/settings/branding")
    return result
  })

const prepareLogoUploadSchema = z.object({
  filename: z.string().min(1).max(300),
  contentType: z
    .string()
    .regex(/^image\/(png|jpeg|jpg|webp|svg\+xml)$/i, "Only images are allowed"),
  fileSize: z.number().int().positive().max(5 * 1024 * 1024),
})

// Branded logos go into the `marketing` bucket so they're publicly readable on
// micro-sites without extra CORS gymnastics.
export const prepareLogoUploadAction = authedAction
  .metadata({ actionName: "settings.prepareLogoUpload" })
  .inputSchema(prepareLogoUploadSchema)
  .action(async ({ parsedInput, ctx }) => {
    return prepareLogoUpload(ctx, parsedInput)
  })

// ─────────────────────────────────────────────────────────────────────────────
// Calendar
// ─────────────────────────────────────────────────────────────────────────────
const calendarSyncSchema = z.object({
  timezone: z.string().max(80).optional(),
  google_calendar_sync_url: z.string().url().nullable().optional(),
  ical_subscription_enabled: z.boolean().optional(),
})

export const updateCalendarSyncAction = authedAction
  .metadata({ actionName: "settings.updateCalendar" })
  .inputSchema(calendarSyncSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await updateCalendarSync(ctx, parsedInput)
    revalidateSettingsSurfaces()
    revalidatePath("/dashboard/settings/calendar")
    return result
  })

// ─────────────────────────────────────────────────────────────────────────────
// Integrations
// ─────────────────────────────────────────────────────────────────────────────
const integrationsSchema = z.object({
  zoom: z
    .object({
      enabled: z.boolean(),
      account_email: z.string().email().optional(),
    })
    .optional(),
  google_meet: z
    .object({
      enabled: z.boolean(),
      account_email: z.string().email().optional(),
    })
    .optional(),
})

export const updateIntegrationsAction = authedAction
  .metadata({ actionName: "settings.updateIntegrations" })
  .inputSchema(integrationsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await updateIntegrations(ctx, parsedInput)
    revalidateSettingsSurfaces()
    revalidatePath("/dashboard/settings/integrations")
    return result
  })

// ─────────────────────────────────────────────────────────────────────────────
// GDPR settings + per-client consent
// ─────────────────────────────────────────────────────────────────────────────
const gdprSettingsSchema = z.object({
  retention_days: z.number().int().min(30).max(3650).optional(),
  auto_delete_inactive: z.boolean().optional(),
  dpo_email: z.string().email().nullable().optional(),
  privacy_policy_url: z.string().url().nullable().optional(),
})

export const updateGdprSettingsAction = authedAction
  .metadata({ actionName: "settings.updateGdpr" })
  .inputSchema(gdprSettingsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await updateGdprSettings(ctx, parsedInput)
    revalidatePath("/dashboard/settings/gdpr")
    return result
  })

const consentSchema = z.object({
  clientId: z.string().uuid(),
  consent: z.enum([
    "marketing_emails",
    "data_sharing",
    "analytics",
    "processing",
  ]),
  granted: z.boolean(),
})

// Consent is stored on `client_settings.metadata.consents` as an append-only
// log so we can prove when a client granted/revoked a particular consent —
// auditors will ask for this on any serious GDPR review.
export const updateClientConsentAction = authedAction
  .metadata({ actionName: "settings.updateClientConsent" })
  .inputSchema(consentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await updateClientConsent(ctx, parsedInput)
    revalidatePath(`/dashboard/clients/${parsedInput.clientId}`)
    revalidatePath("/dashboard/settings/gdpr")
    return result
  })

// ─────────────────────────────────────────────────────────────────────────────
// Team (Pro plan) — invites new members to the Clerk org as admins so they
// can work alongside the owning professional. Accepted invitees don't create
// a second `professionals` row; they share access to the owner's workspace
// via the Clerk org role.
// ─────────────────────────────────────────────────────────────────────────────
const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).default("admin"),
})

export const inviteTeamMemberAction = authedAction
  .metadata({ actionName: "settings.inviteTeamMember" })
  .inputSchema(inviteMemberSchema)
  .action(async ({ ctx, parsedInput }) => {
    const result = await inviteTeamMember(ctx, parsedInput)
    revalidatePath("/dashboard/settings/team")
    return result
  })

const removeMemberSchema = z.object({ userId: z.string().min(1) })

export const removeTeamMemberAction = authedAction
  .metadata({ actionName: "settings.removeTeamMember" })
  .inputSchema(removeMemberSchema)
  .action(async ({ ctx, parsedInput }) => {
    const result = await removeTeamMember(ctx, parsedInput)
    revalidatePath("/dashboard/settings/team")
    return result
  })

// ─────────────────────────────────────────────────────────────────────────────
// Danger zone — delete account. We ask the user to type their email, then
// delete the Clerk user; the Clerk webhook's `user.deleted` handler removes
// the professional row and cascades to every dependent row.
// ─────────────────────────────────────────────────────────────────────────────
const deleteAccountSchema = z.object({
  confirmEmail: z.string().email(),
})

export const deleteAccountAction = authedAction
  .metadata({ actionName: "settings.deleteAccount" })
  .inputSchema(deleteAccountSchema)
  .action(async ({ ctx, parsedInput }) => {
    return deleteAccount(ctx, parsedInput)
  })
