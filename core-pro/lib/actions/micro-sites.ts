"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  ActionError,
  authedAction,
  publicAction,
} from "@/lib/actions/safe-action"
import { dbAdmin } from "@/lib/db/client"
import {
  AVAILABLE_THEMES,
  ensureMicroSite,
  getOwnMicroSite,
  getProfessionalIdForPublishedSlug,
  isSlugAvailable,
  updateMicroSite,
} from "@/lib/db/queries/micro-sites"
import { getProfessional } from "@/lib/db/queries/professionals"
import { leadActivities, leadStages, leads } from "@/lib/db/schema"
import { publicFormRateLimit } from "@/lib/ratelimit"
import type {
  MicroSiteConfig,
  MicroSiteSectionType,
  MicroSiteTheme,
} from "@/types/domain"
import { asc, eq } from "drizzle-orm"
import { headers } from "next/headers"

// ─────────────────────────────────────────────────────────────────────────────
// Shared schemas
// ─────────────────────────────────────────────────────────────────────────────

// Slugs are kebab-case, start+end alphanumeric, 3–48 chars. We reject anything
// that would collide with an existing app route — keeps `/[slug]` unambiguous.
const RESERVED_SLUGS = new Set([
  "dashboard",
  "portal",
  "api",
  "sign-in",
  "sign-up",
  "pricing",
  "blog",
  "sitemap",
  "robots",
  "monitoring",
  "onboarding",
  "admin",
  "legal",
  "terms",
  "privacy",
  "support",
])

const slugSchema = z
  .string()
  .min(3)
  .max(48)
  .regex(
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
    "Use lowercase letters, numbers and dashes.",
  )
  .refine((s) => !RESERVED_SLUGS.has(s), {
    message: "That slug is reserved — try another.",
  })

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Expected #RRGGBB")

const brandingSchema = z.object({
  primary_color: hexColorSchema.optional(),
  secondary_color: hexColorSchema.optional(),
  accent_color: hexColorSchema.optional(),
  logo_url: z.string().url().nullable().optional(),
  cover_url: z.string().url().nullable().optional(),
  tagline: z.string().max(200).optional(),
})

const testimonialSchema = z.object({
  id: z.string().min(1).max(64),
  author: z.string().min(1).max(120),
  role: z.string().max(120).optional(),
  content: z.string().min(1).max(1200),
  rating: z.number().int().min(1).max(5).optional(),
})

const faqItemSchema = z.object({
  id: z.string().min(1).max(64),
  question: z.string().min(1).max(280),
  answer: z.string().min(1).max(2000),
})

const sectionsSchema = z.object({
  hero: z.object({
    enabled: z.boolean(),
    headline: z.string().max(140).optional(),
    subheadline: z.string().max(280).optional(),
    cta_label: z.string().max(60).optional(),
    cta_target: z.enum(["contact", "services", "custom"]).optional(),
    cta_href: z.string().max(500).optional(),
  }),
  about: z.object({
    enabled: z.boolean(),
    title: z.string().max(120).optional(),
    body: z.string().max(4000).optional(),
    certifications: z.array(z.string().max(200)).max(20).optional(),
    experience_years: z.number().int().min(0).max(80).nullable().optional(),
  }),
  services: z.object({
    enabled: z.boolean(),
    title: z.string().max(120).optional(),
    intro: z.string().max(400).optional(),
    show_pricing: z.boolean().optional(),
  }),
  testimonials: z.object({
    enabled: z.boolean(),
    title: z.string().max(120).optional(),
    items: z.array(testimonialSchema).max(24),
  }),
  contact: z.object({
    enabled: z.boolean(),
    title: z.string().max(120).optional(),
    intro: z.string().max(400).optional(),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().max(40).optional(),
  }),
  faq: z.object({
    enabled: z.boolean(),
    title: z.string().max(120).optional(),
    items: z.array(faqItemSchema).max(40),
  }),
  blog: z.object({
    enabled: z.boolean(),
    title: z.string().max(120).optional(),
    body: z.string().max(1200).optional(),
  }),
  niche: z.object({
    enabled: z.boolean(),
    title: z.string().max(120).optional(),
    body: z.string().max(4000).optional(),
  }),
})

const orderSchema = z
  .array(
    z.enum([
      "hero",
      "about",
      "services",
      "testimonials",
      "contact",
      "faq",
      "blog",
      "niche",
    ]),
  )
  .min(1)
  .max(16)

const saveSiteSchema = z.object({
  slug: slugSchema.optional(),
  theme: z.enum(
    AVAILABLE_THEMES.map((t) => t.id) as [MicroSiteTheme, ...MicroSiteTheme[]],
  ),
  order: orderSchema,
  sections: sectionsSchema,
  branding: brandingSchema,
  seoTitle: z.string().max(120).nullable().optional(),
  seoDescription: z.string().max(320).nullable().optional(),
  socialLinks: z
    .object({
      instagram: z.string().url().optional().or(z.literal("")),
      facebook: z.string().url().optional().or(z.literal("")),
      linkedin: z.string().url().optional().or(z.literal("")),
      twitter: z.string().url().optional().or(z.literal("")),
      youtube: z.string().url().optional().or(z.literal("")),
      tiktok: z.string().url().optional().or(z.literal("")),
      website: z.string().url().optional().or(z.literal("")),
    })
    .partial()
    .optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Builder actions (authed)
// ─────────────────────────────────────────────────────────────────────────────

export const saveMicroSiteAction = authedAction
  .metadata({ actionName: "microSites.save" })
  .inputSchema(saveSiteSchema)
  .action(async ({ parsedInput }) => {
    const professional = await getProfessional()
    if (!professional) throw new ActionError("Complete onboarding first.")

    const site = await ensureMicroSite({
      professionalId: professional.id,
      fullName: professional.fullName,
    })

    if (parsedInput.slug && parsedInput.slug !== site.slug) {
      const available = await isSlugAvailable(parsedInput.slug, site.id)
      if (!available) {
        throw new ActionError("That slug is already taken.")
      }
    }

    const sectionsJson: MicroSiteConfig = {
      order: parsedInput.order as MicroSiteSectionType[],
      sections: parsedInput.sections,
      branding: parsedInput.branding,
    }

    const updated = await updateMicroSite({
      slug: parsedInput.slug ?? site.slug,
      theme: parsedInput.theme,
      sections: sectionsJson,
      seoTitle: parsedInput.seoTitle ?? null,
      seoDescription: parsedInput.seoDescription ?? null,
      socialLinks: parsedInput.socialLinks ?? null,
    })
    if (!updated) throw new ActionError("Couldn't save site.")

    revalidatePath("/dashboard/site-builder")
    revalidatePath(`/${updated.slug}`)
    return { id: updated.id, slug: updated.slug }
  })

export const publishMicroSiteAction = authedAction
  .metadata({ actionName: "microSites.publish" })
  .inputSchema(z.object({ publish: z.boolean() }))
  .action(async ({ parsedInput }) => {
    const professional = await getProfessional()
    if (!professional) throw new ActionError("Complete onboarding first.")

    const site = await ensureMicroSite({
      professionalId: professional.id,
      fullName: professional.fullName,
    })

    const updated = await updateMicroSite({ isPublished: parsedInput.publish })
    if (!updated) throw new ActionError("Couldn't update publish state.")

    revalidatePath("/dashboard/site-builder")
    revalidatePath(`/${site.slug}`)
    revalidatePath("/sitemap.xml")
    return { id: updated.id, isPublished: updated.isPublished }
  })

export const checkSlugAvailabilityAction = authedAction
  .metadata({ actionName: "microSites.checkSlug" })
  .inputSchema(z.object({ slug: slugSchema }))
  .action(async ({ parsedInput }) => {
    const site = await getOwnMicroSite()
    if (!site) throw new ActionError("No site to check against yet.")
    const available = await isSlugAvailable(parsedInput.slug, site.id)
    return { available }
  })

// ─────────────────────────────────────────────────────────────────────────────
// Public contact form — creates a lead in the professional's pipeline.
//
// Runs through `publicAction` (no auth) with an extra per-slug ratelimit on
// top of the generic API bucket. DB writes use `dbAdmin` because there's no
// JWT to anchor an RLS session to.
// ─────────────────────────────────────────────────────────────────────────────
const contactFormSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(48)
    .regex(/^[a-z0-9-]+$/),
  fullName: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(40).optional().or(z.literal("")),
  message: z.string().min(1).max(4000),
  // Honeypot — real users leave this empty. Bots that auto-fill every input
  // land here and get a silent success.
  website: z.string().max(400).optional().or(z.literal("")),
})

export const submitContactFormAction = publicAction
  .metadata({ actionName: "microSites.contact" })
  .inputSchema(contactFormSchema)
  .action(async ({ parsedInput }) => {
    // Honeypot tripped — pretend success, skip the write.
    if (parsedInput.website && parsedInput.website.trim().length > 0) {
      return { ok: true }
    }

    if (publicFormRateLimit) {
      const hdrs = await headers()
      const ip =
        hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        hdrs.get("x-real-ip") ??
        "anonymous"
      const { success } = await publicFormRateLimit.limit(
        `microsite:${parsedInput.slug}:${ip}`,
      )
      if (!success) {
        throw new ActionError(
          "You're sending too many submissions — try again in a minute.",
        )
      }
    }

    const resolved = await getProfessionalIdForPublishedSlug(parsedInput.slug)
    if (!resolved) throw new ActionError("This site isn't live right now.")

    // Find (or fall back to) the "new" stage. Default pipeline is seeded
    // lazily when the professional first opens the pipeline, so a brand-new
    // workspace may have zero stages — we bail loudly in that rare case.
    const stageRows = await dbAdmin
      .select({
        id: leadStages.id,
        isWon: leadStages.isWon,
        isLost: leadStages.isLost,
      })
      .from(leadStages)
      .where(eq(leadStages.professionalId, resolved.professionalId))
      .orderBy(asc(leadStages.position))
    const firstStage = stageRows.find((s) => !s.isWon && !s.isLost) ?? stageRows[0]
    if (!firstStage) {
      throw new ActionError(
        "The professional hasn't set up their pipeline yet — try again later.",
      )
    }

    const [created] = await dbAdmin
      .insert(leads)
      .values({
        professionalId: resolved.professionalId,
        stageId: firstStage.id,
        fullName: parsedInput.fullName,
        email: parsedInput.email,
        phone: parsedInput.phone || null,
        source: "micro-site",
        notes: parsedInput.message,
        metadata: {
          slug: parsedInput.slug,
          micro_site_id: resolved.siteId,
        },
      })
      .returning()
    if (!created) throw new ActionError("Couldn't save your message.")

    await dbAdmin.insert(leadActivities).values({
      leadId: created.id,
      type: "created",
      description: "Lead submitted from micro-site",
      metadata: { source: "micro-site", slug: parsedInput.slug },
    })

    revalidatePath("/dashboard/leads")
    return { ok: true, id: created.id }
  })
