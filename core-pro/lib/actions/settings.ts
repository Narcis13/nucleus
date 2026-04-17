"use server"

import { clerkClient } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ActionError, authedAction } from "@/lib/actions/safe-action"
import { getCurrentProfessionalId } from "@/lib/clerk/helpers"
import { dbAdmin } from "@/lib/db/client"
import { withRLS } from "@/lib/db/rls"
import {
  clientSettings,
  clients,
  professionalClients,
  professionalSettings,
} from "@/lib/db/schema"
import {
  getProfessional,
  updateProfessional,
} from "@/lib/db/queries/professionals"
import { getPlan, planAtLeast } from "@/lib/stripe/plans"
import type {
  Branding,
  CalendarSync,
  ConsentRecord,
  GdprSettings,
  IntegrationsConfig,
} from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// Settings actions — profile, branding, calendar, integrations, GDPR, team,
// and the danger-zone delete-account flow. All live here (instead of scattered
// across a dozen files) because they mutate the same small set of rows and
// share identical auth/ratelimit/revalidate shapes.
// ─────────────────────────────────────────────────────────────────────────────

const AVATAR_BUCKET = "avatars"
const BRANDING_LOGO_BUCKET = "marketing"

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
  .action(async ({ parsedInput }) => {
    // Drizzle doesn't strip undefined keys before building the SET clause
    // (it literally SETs them to NULL), so we drop them ourselves.
    const patch = cleanUndefined(parsedInput)
    const updated = await updateProfessional(patch)
    if (!updated) throw new ActionError("Couldn't update profile")

    revalidateSettingsSurfaces()
    revalidatePath("/dashboard/settings/profile")
    return { professional: updated }
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
  .action(async ({ parsedInput }) => {
    const professional = await getProfessional()
    if (!professional) throw new ActionError("Unauthorized")
    const extMatch = parsedInput.filename.match(/\.([a-z0-9]+)$/i)
    const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : ""
    const storageKey = `${professional.id}/avatar-${crypto.randomUUID()}${ext}`
    return { storageKey, bucket: AVATAR_BUCKET }
  })

// Swap the avatarUrl on the professional row. Called after the browser uploads
// the file so the row points at the new public URL.
export const setAvatarUrlAction = authedAction
  .metadata({ actionName: "settings.setAvatarUrl" })
  .inputSchema(z.object({ avatarUrl: z.string().url().nullable() }))
  .action(async ({ parsedInput }) => {
    const updated = await updateProfessional({ avatarUrl: parsedInput.avatarUrl })
    if (!updated) throw new ActionError("Couldn't save avatar")
    revalidateSettingsSurfaces()
    revalidatePath("/dashboard/settings/profile")
    return { avatarUrl: updated.avatarUrl }
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
  .action(async ({ parsedInput }) => {
    const professional = await getProfessional()
    if (!professional) throw new ActionError("Unauthorized")

    // Custom branding is a Pro-plan feature. Still let Starter/Growth users
    // edit — we just won't persist logos. Colour swaps are fine on every tier
    // so they can preview, but we gate anything that would use the marketing
    // bucket at the storage policy layer too.
    const nextBranding: Branding = {
      ...(professional.branding as Branding | null),
      ...cleanUndefined(parsedInput),
    }

    const updated = await updateProfessional({ branding: nextBranding })
    if (!updated) throw new ActionError("Couldn't save branding")

    revalidateSettingsSurfaces()
    revalidatePath("/dashboard/settings/branding")
    return { branding: nextBranding }
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
  .action(async ({ parsedInput }) => {
    const professional = await getProfessional()
    if (!professional) throw new ActionError("Unauthorized")
    const plan = getPlan(professional.plan)
    if (!planAtLeast(plan.id, "growth")) {
      throw new ActionError("Upload a logo on the Growth plan or higher.")
    }
    const extMatch = parsedInput.filename.match(/\.([a-z0-9]+)$/i)
    const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : ""
    const storageKey = `${professional.id}/branding/logo-${crypto.randomUUID()}${ext}`
    return { storageKey, bucket: BRANDING_LOGO_BUCKET }
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
  .action(async ({ parsedInput }) => {
    const professional = await getProfessional()
    if (!professional) throw new ActionError("Unauthorized")

    if (parsedInput.timezone && parsedInput.timezone !== professional.timezone) {
      await updateProfessional({ timezone: parsedInput.timezone })
    }

    const nextSync: CalendarSync = {
      ...(await getExistingSettings(professional.id)).calendarSync,
      ...cleanUndefined(parsedInput),
    }

    await upsertProfessionalSettings(professional.id, { calendarSync: nextSync })

    revalidateSettingsSurfaces()
    revalidatePath("/dashboard/settings/calendar")
    return { calendarSync: nextSync }
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
  .action(async ({ parsedInput }) => {
    const professional = await getProfessional()
    if (!professional) throw new ActionError("Unauthorized")

    const existing = (await getExistingSettings(professional.id)).integrations
    const next: IntegrationsConfig = {
      ...existing,
      ...cleanUndefined(parsedInput),
    }

    await upsertProfessionalSettings(professional.id, { integrations: next })

    revalidateSettingsSurfaces()
    revalidatePath("/dashboard/settings/integrations")
    return { integrations: next }
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
  .action(async ({ parsedInput }) => {
    const professional = await getProfessional()
    if (!professional) throw new ActionError("Unauthorized")

    const existing = (await getExistingSettings(professional.id)).gdprSettings
    const next: GdprSettings = {
      ...existing,
      ...cleanUndefined(parsedInput),
    }

    await upsertProfessionalSettings(professional.id, { gdprSettings: next })

    revalidatePath("/dashboard/settings/gdpr")
    return { gdprSettings: next }
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
  .action(async ({ parsedInput }) => {
    const professionalId = await getCurrentProfessionalId()
    if (!professionalId) throw new ActionError("Unauthorized")

    // Verify the client belongs to this professional (dbAdmin because the
    // settings query runs RLS but we also want to guard the append).
    const link = await dbAdmin
      .select({ id: professionalClients.id })
      .from(professionalClients)
      .where(eq(professionalClients.clientId, parsedInput.clientId))
      .limit(1)
    if (!link[0]) throw new ActionError("Client not found")

    const rows = await dbAdmin
      .select({ metadata: clientSettings.metadata })
      .from(clientSettings)
      .where(eq(clientSettings.clientId, parsedInput.clientId))
      .limit(1)
    const existing = (rows[0]?.metadata ?? {}) as Record<string, unknown>
    const log = Array.isArray(existing.consents)
      ? (existing.consents as ConsentRecord[])
      : []
    const record: ConsentRecord = {
      consent: parsedInput.consent,
      granted: parsedInput.granted,
      recordedAt: new Date().toISOString(),
    }
    const nextMetadata = { ...existing, consents: [...log, record] }

    await dbAdmin
      .insert(clientSettings)
      .values({
        clientId: parsedInput.clientId,
        metadata: nextMetadata,
      })
      .onConflictDoUpdate({
        target: clientSettings.clientId,
        set: { metadata: nextMetadata, updatedAt: new Date() },
      })

    revalidatePath(`/dashboard/clients/${parsedInput.clientId}`)
    revalidatePath("/dashboard/settings/gdpr")
    return { consent: record }
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
    const professional = await getProfessional()
    if (!professional) throw new ActionError("Unauthorized")
    const plan = getPlan(professional.plan)
    if (!planAtLeast(plan.id, "pro")) {
      throw new ActionError("Team management requires the Pro plan.")
    }
    if (!professional.clerkOrgId) {
      throw new ActionError("Complete onboarding before inviting team members.")
    }

    const client = await clerkClient()
    const invitation =
      await client.organizations.createOrganizationInvitation({
        organizationId: professional.clerkOrgId,
        emailAddress: parsedInput.email,
        role: parsedInput.role === "admin" ? "org:admin" : "org:member",
        inviterUserId: ctx.userId,
        publicMetadata: {
          role: parsedInput.role === "admin" ? "professional" : "client",
          invited_as_team: parsedInput.role === "admin",
        },
      })

    revalidatePath("/dashboard/settings/team")
    return { invitationId: invitation.id }
  })

const removeMemberSchema = z.object({ userId: z.string().min(1) })

export const removeTeamMemberAction = authedAction
  .metadata({ actionName: "settings.removeTeamMember" })
  .inputSchema(removeMemberSchema)
  .action(async ({ ctx, parsedInput }) => {
    const professional = await getProfessional()
    if (!professional?.clerkOrgId) {
      throw new ActionError("Unauthorized")
    }
    if (parsedInput.userId === ctx.userId) {
      throw new ActionError("You can't remove yourself — delete the workspace instead.")
    }

    const client = await clerkClient()
    await client.organizations.deleteOrganizationMembership({
      organizationId: professional.clerkOrgId,
      userId: parsedInput.userId,
    })

    revalidatePath("/dashboard/settings/team")
    return { ok: true }
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
    const professional = await getProfessional()
    if (!professional) throw new ActionError("Unauthorized")

    if (
      parsedInput.confirmEmail.trim().toLowerCase() !==
      professional.email.trim().toLowerCase()
    ) {
      throw new ActionError("Confirmation email doesn't match.")
    }

    const client = await clerkClient()
    // Delete the org first (if any) so its membership invitations stop firing.
    if (professional.clerkOrgId) {
      try {
        await client.organizations.deleteOrganization(professional.clerkOrgId)
      } catch {
        // Non-fatal — the user delete below still removes their access.
      }
    }
    await client.users.deleteUser(ctx.userId)
    // The `user.deleted` webhook cascades DB cleanup. Return ok; the session
    // is already invalid by the time this resolves.
    return { ok: true }
  })

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────
function cleanUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v
  }
  return out as T
}

type ExistingSettings = {
  calendarSync: CalendarSync
  integrations: IntegrationsConfig
  gdprSettings: GdprSettings
}

async function getExistingSettings(
  professionalId: string,
): Promise<ExistingSettings> {
  const rows = await dbAdmin
    .select({
      calendarSync: professionalSettings.calendarSync,
      integrations: professionalSettings.integrations,
      gdprSettings: professionalSettings.gdprSettings,
    })
    .from(professionalSettings)
    .where(eq(professionalSettings.professionalId, professionalId))
    .limit(1)
  return {
    calendarSync: (rows[0]?.calendarSync as CalendarSync | null) ?? {},
    integrations:
      (rows[0]?.integrations as IntegrationsConfig | null) ?? {},
    gdprSettings: (rows[0]?.gdprSettings as GdprSettings | null) ?? {},
  }
}

async function upsertProfessionalSettings(
  professionalId: string,
  patch: Partial<{
    calendarSync: CalendarSync
    integrations: IntegrationsConfig
    gdprSettings: GdprSettings
  }>,
) {
  await withRLS(async (tx) => {
    await tx
      .insert(professionalSettings)
      .values({ professionalId, ...patch })
      .onConflictDoUpdate({
        target: professionalSettings.professionalId,
        set: { ...patch, updatedAt: new Date() },
      })
  })
}

// Shared export so the GDPR delete route can call straight into the same
// cascade logic without duplicating FK cleanup.
export async function cascadeDeleteClient(clientId: string): Promise<void> {
  // FK cascades on `clients` handle documents, forms, messages, appointments,
  // professional_clients, client_settings, client_tags. We also clear the
  // Clerk user if the client accepted an invitation so they can't log back in.
  const [row] = await dbAdmin
    .select({ clerkUserId: clients.clerkUserId })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1)

  await dbAdmin.delete(clients).where(eq(clients.id, clientId))

  if (row?.clerkUserId) {
    try {
      const client = await clerkClient()
      await client.users.deleteUser(row.clerkUserId)
    } catch {
      // Clerk delete is best-effort — the local row is already gone.
    }
  }
}

