import "server-only"

import { and, asc, eq, ne } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { withRLS } from "@/lib/db/rls"
import { microSites, professionals, services } from "@/lib/db/schema"
import type {
  MicroSite,
  MicroSiteConfig,
  MicroSiteSocialLinks,
  MicroSiteTheme,
  Professional,
  Service,
} from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// MICRO-SITES — builder-side (RLS, owner only) + public-read helpers.
//
// Published sites are readable by anon + authenticated roles via the
// `micro_sites_public_select` policy. Public reads for *related* tables
// (professionals, services) aren't covered by RLS policies today, so the
// public helpers below go through `dbAdmin` with a narrow column projection.
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_SECTION_ORDER = [
  "hero",
  "about",
  "services",
  "testimonials",
  "faq",
  "contact",
] as const

export const AVAILABLE_THEMES: Array<{
  id: MicroSiteTheme
  label: string
  description: string
}> = [
  {
    id: "default",
    label: "Default",
    description: "Clean, neutral, works for most practices.",
  },
  {
    id: "modern",
    label: "Modern",
    description: "Bold type, generous whitespace, high-contrast.",
  },
  {
    id: "warm",
    label: "Warm",
    description: "Soft tones and rounded cards — great for wellness.",
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Black, white, and one accent. Text-forward.",
  },
  {
    id: "bold",
    label: "Bold",
    description: "Saturated accents, chunky sections — stand out.",
  },
]

// Shape a freshly-created or legacy row carries — the builder normalizes
// whatever is in the database so downstream consumers never touch optional
// keys. Any unknown keys on `raw` are merged into the returned config so the
// builder round-trips niche extensions without losing data.
export function defaultMicroSiteConfig(): MicroSiteConfig {
  return {
    order: [...DEFAULT_SECTION_ORDER],
    sections: {
      hero: {
        enabled: true,
        headline: "",
        subheadline: "",
        cta_label: "Book a consultation",
        cta_target: "contact",
      },
      about: {
        enabled: true,
        title: "About",
        body: "",
        certifications: [],
        experience_years: null,
      },
      services: {
        enabled: true,
        title: "Services",
        intro: "",
        show_pricing: true,
      },
      testimonials: {
        enabled: false,
        title: "What clients say",
        items: [],
      },
      contact: {
        enabled: true,
        title: "Get in touch",
        intro: "Tell me a bit about you and I'll be in touch shortly.",
      },
      faq: {
        enabled: false,
        title: "Frequently asked",
        items: [],
      },
      blog: {
        enabled: false,
        title: "From the journal",
        body: "Blog posts will appear here once you publish your first article.",
      },
      niche: {
        enabled: false,
        title: "",
        body: "",
      },
    },
    branding: {
      primary_color: "#6366f1",
      secondary_color: "#f59e0b",
      accent_color: "#0ea5e9",
      logo_url: null,
      cover_url: null,
      tagline: "",
    },
  }
}

export function normalizeConfig(raw: unknown): MicroSiteConfig {
  const base = defaultMicroSiteConfig()
  if (!raw || typeof raw !== "object") return base
  const input = raw as Partial<MicroSiteConfig>

  // Merge sections shallowly — preserves the shape from defaults while
  // letting saved data win where it exists.
  const merged: MicroSiteConfig = {
    order:
      Array.isArray(input.order) && input.order.length > 0
        ? (input.order.filter(
            (o) => typeof o === "string",
          ) as MicroSiteConfig["order"])
        : base.order,
    sections: {
      hero: { ...base.sections.hero, ...(input.sections?.hero ?? {}) },
      about: { ...base.sections.about, ...(input.sections?.about ?? {}) },
      services: {
        ...base.sections.services,
        ...(input.sections?.services ?? {}),
      },
      testimonials: {
        ...base.sections.testimonials,
        ...(input.sections?.testimonials ?? {}),
      },
      contact: { ...base.sections.contact, ...(input.sections?.contact ?? {}) },
      faq: { ...base.sections.faq, ...(input.sections?.faq ?? {}) },
      blog: { ...base.sections.blog, ...(input.sections?.blog ?? {}) },
      niche: { ...base.sections.niche, ...(input.sections?.niche ?? {}) },
    },
    branding: { ...base.branding, ...(input.branding ?? {}) },
  }
  return merged
}

// Pick a slug that's guaranteed not to collide with an existing one. Used when
// bootstrapping a brand-new micro-site row for a professional who hasn't
// visited the builder yet.
export function suggestSlug(fullName: string, fallback: string): string {
  const base =
    fullName
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || fallback
  return base
}

// ─────────────────────────────────────────────────────────────────────────────
// Owner queries (RLS-enforced)
// ─────────────────────────────────────────────────────────────────────────────
export async function getOwnMicroSite(): Promise<MicroSite | null> {
  return withRLS(async (tx) => {
    const rows = await tx.select().from(microSites).limit(1)
    return rows[0] ?? null
  })
}

// Insert-or-return the row for the current professional. The sections default
// is seeded from `defaultMicroSiteConfig()` so the builder has something to
// render the first time it opens.
export async function ensureMicroSite(args: {
  professionalId: string
  fullName: string
}): Promise<MicroSite> {
  return withRLS(async (tx) => {
    const existing = await tx
      .select()
      .from(microSites)
      .where(eq(microSites.professionalId, args.professionalId))
      .limit(1)
    if (existing[0]) return existing[0]

    const fallback = args.professionalId.slice(0, 8)
    let candidate = suggestSlug(args.fullName, fallback)

    // Collision guard. We check with dbAdmin because an unrelated row may
    // exist outside our RLS scope.
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const hit = await dbAdmin
        .select({ id: microSites.id })
        .from(microSites)
        .where(eq(microSites.slug, candidate))
        .limit(1)
      if (hit.length === 0) break
      candidate = `${suggestSlug(args.fullName, fallback)}-${Math.random()
        .toString(36)
        .slice(2, 6)}`
    }

    const [created] = await tx
      .insert(microSites)
      .values({
        professionalId: args.professionalId,
        slug: candidate,
        isPublished: false,
        theme: "default",
        sections: defaultMicroSiteConfig(),
      })
      .returning()
    if (!created) throw new Error("Failed to create micro_site row")
    return created
  })
}

export async function updateMicroSite(
  patch: Partial<
    Pick<
      MicroSite,
      | "slug"
      | "theme"
      | "sections"
      | "seoTitle"
      | "seoDescription"
      | "socialLinks"
      | "isPublished"
      | "customDomain"
    >
  >,
): Promise<MicroSite | null> {
  return withRLS(async (tx) => {
    const rows = await tx.update(microSites).set(patch).returning()
    return rows[0] ?? null
  })
}

// Check if a slug is free (excluding the caller's own site). Runs under RLS
// for the own-site check, then via `dbAdmin` for the uniqueness probe so we
// can see sites the current user doesn't own.
export async function isSlugAvailable(
  slug: string,
  ownSiteId: string,
): Promise<boolean> {
  const rows = await dbAdmin
    .select({ id: microSites.id })
    .from(microSites)
    .where(and(eq(microSites.slug, slug), ne(microSites.id, ownSiteId)))
    .limit(1)
  return rows.length === 0
}

// ─────────────────────────────────────────────────────────────────────────────
// Public helpers — used by the anonymous `/[slug]` route. Every helper returns
// a narrow projection so the public page never has access to billing fields,
// Stripe ids, or the Clerk user id.
// ─────────────────────────────────────────────────────────────────────────────

export type PublicMicroSite = {
  id: string
  slug: string
  theme: string
  isPublished: boolean
  sections: MicroSiteConfig
  seoTitle: string | null
  seoDescription: string | null
  socialLinks: MicroSiteSocialLinks | null
  professional: {
    id: string
    fullName: string
    bio: string | null
    avatarUrl: string | null
    specialization: string[] | null
    certifications: string[] | null
    currency: string
    locale: string
  }
  services: Array<Pick<Service, "id" | "name" | "description" | "price" | "currency" | "durationMinutes">>
}

export async function getPublicMicroSite(
  slug: string,
): Promise<PublicMicroSite | null> {
  const rows = await dbAdmin
    .select({
      site: microSites,
      professional: {
        id: professionals.id,
        fullName: professionals.fullName,
        bio: professionals.bio,
        avatarUrl: professionals.avatarUrl,
        specialization: professionals.specialization,
        certifications: professionals.certifications,
        currency: professionals.currency,
        locale: professionals.locale,
      },
    })
    .from(microSites)
    .innerJoin(professionals, eq(professionals.id, microSites.professionalId))
    .where(and(eq(microSites.slug, slug), eq(microSites.isPublished, true)))
    .limit(1)

  const hit = rows[0]
  if (!hit) return null

  const serviceRows = await dbAdmin
    .select({
      id: services.id,
      name: services.name,
      description: services.description,
      price: services.price,
      currency: services.currency,
      durationMinutes: services.durationMinutes,
    })
    .from(services)
    .where(
      and(
        eq(services.professionalId, hit.professional.id),
        eq(services.isActive, true),
      ),
    )
    .orderBy(asc(services.name))

  return {
    id: hit.site.id,
    slug: hit.site.slug,
    theme: hit.site.theme,
    isPublished: hit.site.isPublished,
    sections: normalizeConfig(hit.site.sections),
    seoTitle: hit.site.seoTitle,
    seoDescription: hit.site.seoDescription,
    socialLinks: (hit.site.socialLinks as MicroSiteSocialLinks | null) ?? null,
    professional: hit.professional as PublicMicroSite["professional"],
    services: serviceRows,
  }
}

// Enumerates every published site — used by `app/sitemap.ts`. Kept deliberately
// narrow (slug + updatedAt) to avoid shipping sensitive profile data anywhere.
export async function listPublishedSlugs(): Promise<
  Array<{ slug: string; updatedAt: Date }>
> {
  const rows = await dbAdmin
    .select({
      slug: microSites.slug,
      updatedAt: microSites.updatedAt,
    })
    .from(microSites)
    .where(eq(microSites.isPublished, true))
  return rows
}

// Used when the public contact form submits — resolves the slug to a
// professional id so the lead can be attributed. No RLS context exists (it's
// an anonymous submission) so this goes through dbAdmin and never returns
// anything about an unpublished site.
export async function getProfessionalIdForPublishedSlug(
  slug: string,
): Promise<{ professionalId: string; siteId: string } | null> {
  const rows = await dbAdmin
    .select({
      professionalId: microSites.professionalId,
      siteId: microSites.id,
    })
    .from(microSites)
    .where(and(eq(microSites.slug, slug), eq(microSites.isPublished, true)))
    .limit(1)
  return rows[0] ?? null
}

// Re-export the professional type for callers assembling the builder context.
export type { Professional }
