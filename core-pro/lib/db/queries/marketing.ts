import "server-only"

import { and, asc, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { withRLS } from "@/lib/db/rls"
import {
  clientTags,
  clients,
  emailCampaignRecipients,
  emailCampaigns,
  leadMagnetClaims,
  leadMagnetDownloads,
  leadMagnets,
  professionalClients,
  socialTemplates,
} from "@/lib/db/schema"
import type {
  EmailCampaign,
  EmailCampaignAudience,
  EmailCampaignRecipient,
  LeadMagnet,
  NewEmailCampaign,
  NewEmailCampaignRecipient,
  NewLeadMagnet,
  NewSocialTemplate,
  SocialTemplate,
} from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL CAMPAIGNS
// ─────────────────────────────────────────────────────────────────────────────

export type EmailCampaignListItem = {
  campaign: EmailCampaign
  recipientCount: number
}

export async function listEmailCampaigns(): Promise<EmailCampaignListItem[]> {
  return withRLS(async (tx) => {
    const rows = await tx
      .select({
        campaign: emailCampaigns,
        recipientCount: sql<number>`(
          select count(*)::int from ${emailCampaignRecipients}
          where ${emailCampaignRecipients.campaignId} = ${emailCampaigns.id}
        )`,
      })
      .from(emailCampaigns)
      .orderBy(desc(emailCampaigns.createdAt))
    return rows.map((r) => ({
      campaign: r.campaign,
      recipientCount: r.recipientCount ?? 0,
    }))
  })
}

export async function getEmailCampaign(
  id: string,
): Promise<EmailCampaign | null> {
  return withRLS(async (tx) => {
    const rows = await tx
      .select()
      .from(emailCampaigns)
      .where(eq(emailCampaigns.id, id))
      .limit(1)
    return rows[0] ?? null
  })
}

export async function createEmailCampaign(
  data: Omit<NewEmailCampaign, "id">,
): Promise<EmailCampaign> {
  return withRLS(async (tx) => {
    const rows = await tx
      .insert(emailCampaigns)
      .values(data as NewEmailCampaign)
      .returning()
    const created = rows[0]
    if (!created) throw new Error("Failed to create campaign row.")
    return created
  })
}

export async function updateEmailCampaign(
  id: string,
  patch: Partial<EmailCampaign>,
): Promise<EmailCampaign | null> {
  return withRLS(async (tx) => {
    const rows = await tx
      .update(emailCampaigns)
      .set(patch)
      .where(eq(emailCampaigns.id, id))
      .returning()
    return rows[0] ?? null
  })
}

export async function deleteEmailCampaign(id: string): Promise<boolean> {
  return withRLS(async (tx) => {
    const rows = await tx
      .delete(emailCampaigns)
      .where(eq(emailCampaigns.id, id))
      .returning({ id: emailCampaigns.id })
    return rows.length > 0
  })
}

export async function listCampaignRecipients(
  campaignId: string,
): Promise<EmailCampaignRecipient[]> {
  return withRLS(async (tx) => {
    return tx
      .select()
      .from(emailCampaignRecipients)
      .where(eq(emailCampaignRecipients.campaignId, campaignId))
      .orderBy(asc(emailCampaignRecipients.email))
  })
}

// Resolve an audience descriptor into the concrete list of recipients to mail.
// Returns client-scoped rows so the merge tags have names to substitute; email
// is the hard requirement.
export type ResolvedRecipient = {
  email: string
  fullName: string | null
  clientId: string | null
}

export async function resolveAudience(
  audience: EmailCampaignAudience,
): Promise<ResolvedRecipient[]> {
  return withRLS(async (tx) => {
    if (audience.type === "all_clients") {
      const rows = await tx
        .select({
          id: clients.id,
          email: clients.email,
          fullName: clients.fullName,
          status: professionalClients.status,
        })
        .from(professionalClients)
        .innerJoin(clients, eq(clients.id, professionalClients.clientId))
      return rows
        .filter((r) => r.status === "active")
        .map((r) => ({
          email: r.email,
          fullName: r.fullName,
          clientId: r.id,
        }))
    }
    if (audience.type === "status") {
      const rows = await tx
        .select({
          id: clients.id,
          email: clients.email,
          fullName: clients.fullName,
        })
        .from(professionalClients)
        .innerJoin(clients, eq(clients.id, professionalClients.clientId))
        .where(eq(professionalClients.status, audience.status))
      return rows.map((r) => ({
        email: r.email,
        fullName: r.fullName,
        clientId: r.id,
      }))
    }
    if (audience.type === "tag") {
      const rows = await tx
        .select({
          id: clients.id,
          email: clients.email,
          fullName: clients.fullName,
        })
        .from(clientTags)
        .innerJoin(clients, eq(clients.id, clientTags.clientId))
        .where(eq(clientTags.tagId, audience.tagId))
      return rows.map((r) => ({
        email: r.email,
        fullName: r.fullName,
        clientId: r.id,
      }))
    }
    if (audience.type === "leads_all") {
      // Leads don't have a 1:1 client_id, so return nulls; the merge tag
      // substitution falls back to the lead's own name when it has one.
      return []
    }
    return []
  })
}

// Called from the send action after Resend returns. Uses `dbAdmin` because the
// caller may be outside an RLS transaction (batched send is fire-and-forget).
export async function insertRecipients(
  rows: NewEmailCampaignRecipient[],
): Promise<void> {
  if (rows.length === 0) return
  await dbAdmin.insert(emailCampaignRecipients).values(rows)
}

export async function markRecipientSent(args: {
  id: string
  resendMessageId?: string | null
  error?: string | null
}): Promise<void> {
  await dbAdmin
    .update(emailCampaignRecipients)
    .set({
      status: args.error ? "error" : "sent",
      resendMessageId: args.resendMessageId ?? null,
      error: args.error ?? null,
      sentAt: new Date(),
    })
    .where(eq(emailCampaignRecipients.id, args.id))
}

export async function bumpCampaignSentCounter(
  campaignId: string,
  delta: number,
): Promise<void> {
  if (delta === 0) return
  await dbAdmin
    .update(emailCampaigns)
    .set({
      sentCount: sql`${emailCampaigns.sentCount} + ${delta}`,
    })
    .where(eq(emailCampaigns.id, campaignId))
}

export async function finalizeCampaignSend(
  campaignId: string,
  sentCount: number,
): Promise<void> {
  await dbAdmin
    .update(emailCampaigns)
    .set({
      status: "sent",
      sentAt: new Date(),
      sentCount,
    })
    .where(eq(emailCampaigns.id, campaignId))
}

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

export async function listSocialTemplates(): Promise<SocialTemplate[]> {
  return withRLS(async (tx) => {
    return tx
      .select()
      .from(socialTemplates)
      .orderBy(desc(socialTemplates.updatedAt))
  })
}

export async function createSocialTemplate(
  data: Omit<NewSocialTemplate, "id">,
): Promise<SocialTemplate> {
  return withRLS(async (tx) => {
    const rows = await tx
      .insert(socialTemplates)
      .values(data as NewSocialTemplate)
      .returning()
    const created = rows[0]
    if (!created) throw new Error("Failed to create social template.")
    return created
  })
}

export async function updateSocialTemplate(
  id: string,
  patch: Partial<SocialTemplate>,
): Promise<SocialTemplate | null> {
  return withRLS(async (tx) => {
    const rows = await tx
      .update(socialTemplates)
      .set(patch)
      .where(eq(socialTemplates.id, id))
      .returning()
    return rows[0] ?? null
  })
}

export async function deleteSocialTemplate(id: string): Promise<boolean> {
  return withRLS(async (tx) => {
    const rows = await tx
      .delete(socialTemplates)
      .where(eq(socialTemplates.id, id))
      .returning({ id: socialTemplates.id })
    return rows.length > 0
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// LEAD MAGNETS
// ─────────────────────────────────────────────────────────────────────────────

export async function listLeadMagnets(): Promise<LeadMagnet[]> {
  return withRLS(async (tx) => {
    return tx
      .select()
      .from(leadMagnets)
      .orderBy(desc(leadMagnets.createdAt))
  })
}

export async function createLeadMagnet(
  data: Omit<NewLeadMagnet, "id">,
): Promise<LeadMagnet> {
  return withRLS(async (tx) => {
    const rows = await tx
      .insert(leadMagnets)
      .values(data as NewLeadMagnet)
      .returning()
    const created = rows[0]
    if (!created) throw new Error("Failed to create lead magnet.")
    return created
  })
}

export async function updateLeadMagnet(
  id: string,
  patch: Partial<LeadMagnet>,
): Promise<LeadMagnet | null> {
  return withRLS(async (tx) => {
    const rows = await tx
      .update(leadMagnets)
      .set(patch)
      .where(eq(leadMagnets.id, id))
      .returning()
    return rows[0] ?? null
  })
}

export async function deleteLeadMagnet(id: string): Promise<boolean> {
  return withRLS(async (tx) => {
    const rows = await tx
      .delete(leadMagnets)
      .where(eq(leadMagnets.id, id))
      .returning({ id: leadMagnets.id })
    return rows.length > 0
  })
}

// Public-facing helper — the anon micro-site calls this to surface magnets
// without an RLS session. Published-only.
export async function listPublicLeadMagnets(
  professionalId: string,
): Promise<LeadMagnet[]> {
  return dbAdmin
    .select()
    .from(leadMagnets)
    .where(
      and(
        eq(leadMagnets.professionalId, professionalId),
        eq(leadMagnets.isPublished, true),
      ),
    )
    .orderBy(desc(leadMagnets.createdAt))
}

export async function getPublishedLeadMagnet(
  id: string,
): Promise<LeadMagnet | null> {
  const rows = await dbAdmin
    .select()
    .from(leadMagnets)
    .where(and(eq(leadMagnets.id, id), eq(leadMagnets.isPublished, true)))
    .limit(1)
  return rows[0] ?? null
}

export async function recordLeadMagnetDownload(args: {
  leadMagnetId: string
  email: string
  fullName?: string | null
  phone?: string | null
  leadId?: string | null
}): Promise<void> {
  await dbAdmin.insert(leadMagnetDownloads).values({
    leadMagnetId: args.leadMagnetId,
    email: args.email,
    fullName: args.fullName ?? null,
    phone: args.phone ?? null,
    leadId: args.leadId ?? null,
  })
  await dbAdmin
    .update(leadMagnets)
    .set({ downloadCount: sql`${leadMagnets.downloadCount} + 1` })
    .where(eq(leadMagnets.id, args.leadMagnetId))
}

// ─────────────────────────────────────────────────────────────────────────────
// LEAD MAGNET CLAIMS — double-opt-in tickets. We never expose the raw token,
// only `sha256(token)` lives at rest. Claim consumption is a conditional
// UPDATE so two parallel clicks of the same link race deterministically: the
// loser sees an unclaimed update and falls through to the expired path.
// ─────────────────────────────────────────────────────────────────────────────

export type LeadMagnetClaim = {
  id: string
  leadMagnetId: string
  professionalId: string
  email: string
  fullName: string
  phone: string | null
  slug: string
}

export async function createLeadMagnetClaim(args: {
  leadMagnetId: string
  professionalId: string
  email: string
  fullName: string
  phone: string | null
  slug: string
  tokenHash: Buffer
  expiresAt: Date
}): Promise<{ id: string }> {
  const [row] = await dbAdmin
    .insert(leadMagnetClaims)
    .values({
      leadMagnetId: args.leadMagnetId,
      professionalId: args.professionalId,
      email: args.email,
      fullName: args.fullName,
      phone: args.phone,
      slug: args.slug,
      tokenHash: args.tokenHash,
      expiresAt: args.expiresAt,
    })
    .returning({ id: leadMagnetClaims.id })
  return row
}

export async function consumeLeadMagnetClaim(
  tokenHash: Buffer,
): Promise<LeadMagnetClaim | null> {
  const rows = await dbAdmin
    .update(leadMagnetClaims)
    .set({ claimedAt: new Date() })
    .where(
      and(
        eq(leadMagnetClaims.tokenHash, tokenHash),
        isNull(leadMagnetClaims.claimedAt),
        gt(leadMagnetClaims.expiresAt, sql`now()`),
      ),
    )
    .returning({
      id: leadMagnetClaims.id,
      leadMagnetId: leadMagnetClaims.leadMagnetId,
      professionalId: leadMagnetClaims.professionalId,
      email: leadMagnetClaims.email,
      fullName: leadMagnetClaims.fullName,
      phone: leadMagnetClaims.phone,
      slug: leadMagnetClaims.slug,
    })
  return rows[0] ?? null
}

export async function attachLeadIdToClaim(
  claimId: string,
  leadId: string,
): Promise<void> {
  await dbAdmin
    .update(leadMagnetClaims)
    .set({ leadId })
    .where(eq(leadMagnetClaims.id, claimId))
}

export async function listLeadMagnetDownloads(
  leadMagnetId: string,
): Promise<Array<{ email: string; fullName: string | null; createdAt: Date }>> {
  return withRLS(async (tx) => {
    const rows = await tx
      .select({
        email: leadMagnetDownloads.email,
        fullName: leadMagnetDownloads.fullName,
        createdAt: leadMagnetDownloads.createdAt,
      })
      .from(leadMagnetDownloads)
      .where(eq(leadMagnetDownloads.leadMagnetId, leadMagnetId))
      .orderBy(desc(leadMagnetDownloads.createdAt))
      .limit(200)
    return rows
  })
}

// Shortcut used by the send-email action to list client emails that match a
// set of tag ids. Kept here so the audience resolver stays close to the
// tables it touches.
export async function clientsByTagIds(
  tagIds: string[],
): Promise<ResolvedRecipient[]> {
  if (tagIds.length === 0) return []
  return withRLS(async (tx) => {
    const rows = await tx
      .select({
        id: clients.id,
        email: clients.email,
        fullName: clients.fullName,
      })
      .from(clientTags)
      .innerJoin(clients, eq(clients.id, clientTags.clientId))
      .where(inArray(clientTags.tagId, tagIds))
    return rows.map((r) => ({
      email: r.email,
      fullName: r.fullName,
      clientId: r.id,
    }))
  })
}
