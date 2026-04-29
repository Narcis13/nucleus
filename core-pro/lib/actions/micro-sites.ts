"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { z } from "zod"

import {
  ActionError,
  authedAction,
  publicAction,
} from "@/lib/actions/safe-action"
import { AVAILABLE_THEMES } from "@/lib/db/queries/micro-sites"
import { publicFormRateLimit } from "@/lib/ratelimit"
import { checkSlugAvailability } from "@/lib/services/micro-sites/check-slug-availability"
import { publishMicroSite } from "@/lib/services/micro-sites/publish"
import { saveMicroSite } from "@/lib/services/micro-sites/save"
import { submitContactForm } from "@/lib/services/micro-sites/submit-contact-form"
import type {
  MicroSiteConfig,
  MicroSiteSectionType,
  MicroSiteTheme,
} from "@/types/domain"

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
  .action(async ({ parsedInput, ctx }) => {
    const result = await saveMicroSite(ctx, {
      slug: parsedInput.slug,
      theme: parsedInput.theme,
      order: parsedInput.order as MicroSiteSectionType[],
      sections: parsedInput.sections as MicroSiteConfig["sections"],
      branding: parsedInput.branding as MicroSiteConfig["branding"],
      seoTitle: parsedInput.seoTitle ?? null,
      seoDescription: parsedInput.seoDescription ?? null,
      socialLinks: parsedInput.socialLinks ?? undefined,
    })
    revalidatePath("/dashboard/site-builder")
    revalidatePath(`/${result.slug}`)
    return result
  })

export const publishMicroSiteAction = authedAction
  .metadata({ actionName: "microSites.publish" })
  .inputSchema(z.object({ publish: z.boolean() }))
  .action(async ({ parsedInput, ctx }) => {
    const result = await publishMicroSite(ctx, parsedInput)
    revalidatePath("/dashboard/site-builder")
    revalidatePath(`/${result.slug}`)
    revalidatePath("/sitemap.xml")
    return { id: result.id, isPublished: result.isPublished }
  })

export const checkSlugAvailabilityAction = authedAction
  .metadata({ actionName: "microSites.checkSlug" })
  .inputSchema(z.object({ slug: slugSchema }))
  .action(async ({ parsedInput, ctx }) => {
    return checkSlugAvailability(ctx, parsedInput)
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

    const result = await submitContactForm(parsedInput)
    revalidatePath("/dashboard/leads")
    return result
  })
