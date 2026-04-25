"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ActionError, authedAction, publicAction } from "@/lib/actions/safe-action"
import { createEmailCampaign } from "@/lib/services/marketing/create-email-campaign"
import { createLeadMagnet } from "@/lib/services/marketing/create-lead-magnet"
import { createSocialTemplate } from "@/lib/services/marketing/create-social-template"
import { deleteEmailCampaign } from "@/lib/services/marketing/delete-email-campaign"
import { deleteLeadMagnet } from "@/lib/services/marketing/delete-lead-magnet"
import { deleteSocialTemplate } from "@/lib/services/marketing/delete-social-template"
import { logSocialExport } from "@/lib/services/marketing/log-social-export"
import { prepareLeadMagnetUpload } from "@/lib/services/marketing/prepare-lead-magnet"
import { requestLeadMagnet } from "@/lib/services/marketing/request-lead-magnet"
import { sendCampaign } from "@/lib/services/marketing/send-campaign"
import { updateEmailCampaign } from "@/lib/services/marketing/update-email-campaign"
import { updateLeadMagnet } from "@/lib/services/marketing/update-lead-magnet"
import { updateSocialTemplate } from "@/lib/services/marketing/update-social-template"
import { publicFormRateLimit } from "@/lib/ratelimit"
import type { EmailCampaignAudience } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// Email campaign schemas
// ─────────────────────────────────────────────────────────────────────────────
const audienceSchema: z.ZodType<EmailCampaignAudience> = z.union([
  z.object({ type: z.literal("all_clients") }),
  z.object({ type: z.literal("tag"), tagId: z.string().uuid() }),
  z.object({ type: z.literal("status"), status: z.string().min(1).max(30) }),
  z.object({ type: z.literal("leads_all") }),
])

const campaignInputSchema = z.object({
  name: z.string().min(1).max(160),
  templateKey: z.string().min(1).max(60),
  subject: z.string().min(1).max(200),
  bodyHtml: z.string().min(1).max(200_000),
  audience: audienceSchema,
  scheduledAt: z
    .string()
    .datetime()
    .nullable()
    .optional(),
})

const campaignUpdateSchema = campaignInputSchema.partial().extend({
  id: z.string().uuid(),
})

const idSchema = z.object({ id: z.string().uuid() })

// ─────────────────────────────────────────────────────────────────────────────
// Email campaign actions
// ─────────────────────────────────────────────────────────────────────────────

export const createEmailCampaignAction = authedAction
  .metadata({ actionName: "marketing.createCampaign" })
  .inputSchema(campaignInputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await createEmailCampaign(ctx, parsedInput)
    revalidatePath("/dashboard/marketing")
    return result
  })

export const updateEmailCampaignAction = authedAction
  .metadata({ actionName: "marketing.updateCampaign" })
  .inputSchema(campaignUpdateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await updateEmailCampaign(ctx, parsedInput)
    revalidatePath("/dashboard/marketing")
    return result
  })

export const deleteEmailCampaignAction = authedAction
  .metadata({ actionName: "marketing.deleteCampaign" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await deleteEmailCampaign(ctx, parsedInput)
    revalidatePath("/dashboard/marketing")
    return result
  })

export const sendCampaignAction = authedAction
  .metadata({ actionName: "marketing.sendCampaign" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await sendCampaign(ctx, parsedInput)
    revalidatePath("/dashboard/marketing")
    return result
  })

// ─────────────────────────────────────────────────────────────────────────────
// Social templates
// ─────────────────────────────────────────────────────────────────────────────

const designSchema = z
  .object({
    title: z.string().max(200).optional(),
    body: z.string().max(1200).optional(),
    cta: z.string().max(80).optional(),
    author: z.string().max(80).optional(),
    primaryColor: z.string().max(20).optional(),
    secondaryColor: z.string().max(20).optional(),
    textColor: z.string().max(20).optional(),
    backgroundStyle: z.enum(["solid", "gradient"]).optional(),
    logoUrl: z.string().url().nullable().optional(),
  })
  .passthrough()

const socialTemplateInputSchema = z.object({
  name: z.string().min(1).max(120),
  layout: z.string().min(1).max(60),
  platform: z.enum([
    "instagram_square",
    "instagram_story",
    "linkedin_post",
    "twitter_post",
  ]),
  design: designSchema,
  caption: z.string().max(3000).nullable().optional(),
  hashtags: z.array(z.string().max(60)).max(30).optional(),
})

const socialTemplateUpdateSchema = socialTemplateInputSchema.partial().extend({
  id: z.string().uuid(),
})

export const createSocialTemplateAction = authedAction
  .metadata({ actionName: "marketing.createSocialTemplate" })
  .inputSchema(socialTemplateInputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await createSocialTemplate(ctx, parsedInput)
    revalidatePath("/dashboard/marketing")
    return result
  })

export const updateSocialTemplateAction = authedAction
  .metadata({ actionName: "marketing.updateSocialTemplate" })
  .inputSchema(socialTemplateUpdateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await updateSocialTemplate(ctx, parsedInput)
    revalidatePath("/dashboard/marketing")
    return result
  })

export const deleteSocialTemplateAction = authedAction
  .metadata({ actionName: "marketing.deleteSocialTemplate" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await deleteSocialTemplate(ctx, parsedInput)
    revalidatePath("/dashboard/marketing")
    return result
  })

export const logSocialExportAction = authedAction
  .metadata({ actionName: "marketing.logSocialExport" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    return logSocialExport(ctx, parsedInput)
  })

// ─────────────────────────────────────────────────────────────────────────────
// Lead magnets
// ─────────────────────────────────────────────────────────────────────────────

const prepareLeadMagnetUploadSchema = z.object({
  filename: z.string().min(1).max(300),
  fileSize: z.number().int().nonnegative().max(25 * 1024 * 1024),
  fileType: z.string().max(100).optional(),
})

const createLeadMagnetSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(2000).nullable().optional(),
  fileKey: z.string().min(1).max(500),
  fileName: z.string().min(1).max(300),
  fileSize: z.number().int().nonnegative(),
  isPublished: z.boolean().default(true),
})

const updateLeadMagnetSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(160).optional(),
  description: z.string().max(2000).nullable().optional(),
  isPublished: z.boolean().optional(),
})

const requestLeadMagnetSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(48)
    .regex(/^[a-z0-9-]+$/),
  leadMagnetId: z.string().uuid(),
  fullName: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(40).optional().or(z.literal("")),
  // Honeypot — see micro-sites contact-form for pattern.
  website: z.string().max(400).optional().or(z.literal("")),
})

export const prepareLeadMagnetUploadAction = authedAction
  .metadata({ actionName: "marketing.prepareLeadMagnet" })
  .inputSchema(prepareLeadMagnetUploadSchema)
  .action(async ({ parsedInput, ctx }) => {
    return prepareLeadMagnetUpload(ctx, parsedInput)
  })

export const createLeadMagnetAction = authedAction
  .metadata({ actionName: "marketing.createLeadMagnet" })
  .inputSchema(createLeadMagnetSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await createLeadMagnet(ctx, parsedInput)
    revalidatePath("/dashboard/marketing")
    return result
  })

export const updateLeadMagnetAction = authedAction
  .metadata({ actionName: "marketing.updateLeadMagnet" })
  .inputSchema(updateLeadMagnetSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await updateLeadMagnet(ctx, parsedInput)
    revalidatePath("/dashboard/marketing")
    return result
  })

export const deleteLeadMagnetAction = authedAction
  .metadata({ actionName: "marketing.deleteLeadMagnet" })
  .inputSchema(idSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await deleteLeadMagnet(ctx, parsedInput)
    revalidatePath("/dashboard/marketing")
    return result
  })

// Public action — the micro-site's lead-magnet form posts here. We create a
// lead in the pro's pipeline and return a short-lived signed URL. The file
// itself lives in the public `marketing` bucket, but we keep the signed URL
// because (a) we want the download to count in the same flow, and (b) it gives
// us a thin layer of rate-limiting via the URL expiry.
export const requestLeadMagnetAction = publicAction
  .metadata({ actionName: "marketing.requestLeadMagnet" })
  .inputSchema(requestLeadMagnetSchema)
  .action(async ({ parsedInput }) => {
    if (publicFormRateLimit) {
      const { success } = await publicFormRateLimit.limit(
        `magnet:${parsedInput.slug}:${parsedInput.email}`,
      )
      if (!success) {
        throw new ActionError(
          "You're downloading too quickly — try again in a minute.",
        )
      }
    }

    const result = await requestLeadMagnet(parsedInput)
    revalidatePath("/dashboard/leads")
    revalidatePath("/dashboard/marketing")
    return result
  })
