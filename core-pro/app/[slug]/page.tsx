import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AboutSection } from "@/components/micro-site/about-section"
import {
  BlogSection,
  NichePlaceholderSection,
} from "@/components/micro-site/blog-section"
import { ContactSection } from "@/components/micro-site/contact-section"
import { FaqSection } from "@/components/micro-site/faq-section"
import { MicroSiteFooter } from "@/components/micro-site/footer"
import { HeroSection } from "@/components/micro-site/hero-section"
import { LeadMagnetsSection } from "@/components/micro-site/lead-magnets-section"
import { ServicesSection } from "@/components/micro-site/services-section"
import { TestimonialsSection } from "@/components/micro-site/testimonials-section"
import { resolveTheme } from "@/components/micro-site/theme"
import { listPublicLeadMagnets } from "@/lib/db/queries/marketing"
import {
  getPublicMicroSite,
  listPublishedSlugs,
} from "@/lib/db/queries/micro-sites"
import { env } from "@/lib/env"
import type { MicroSiteSectionType } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// Public micro-site page
//
// Rendered as an SSG page with ISR fallback — new sites appear within
// `revalidate` seconds of being published, and edits trigger an on-demand
// `revalidatePath(`/${slug}`)` from the save actions for instant refresh.
//
// Rendering flow:
//   1. generateStaticParams pre-builds every currently-published slug.
//   2. generateMetadata produces per-slug SEO (title / description / OG).
//   3. The page itself resolves the site from the DB and walks `sections.order`
//      rendering whichever section components are enabled.
// ─────────────────────────────────────────────────────────────────────────────

// 10 minutes — balances freshness with build load for the common read path.
// Owners also get instant updates via `revalidatePath` in the save actions.
export const revalidate = 600
export const dynamicParams = true

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const rows = await listPublishedSlugs()
    return rows.map((r) => ({ slug: r.slug }))
  } catch {
    // During build the DB may not be reachable (e.g. preview with missing
    // secrets). Falling back to an empty list still lets ISR pick up sites
    // at request time via `dynamicParams`.
    return []
  }
}

function absoluteUrl(path: string): string {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const site = await getPublicMicroSite(slug)
  if (!site) return { title: "Not found" }

  const title =
    site.seoTitle || site.professional.fullName || env.NEXT_PUBLIC_APP_NAME
  const description =
    site.seoDescription ||
    site.sections.sections.hero.subheadline ||
    site.professional.bio ||
    `${site.professional.fullName} — professional services.`

  const url = absoluteUrl(`/${slug}`)
  const ogImage = absoluteUrl(`/${slug}/opengraph-image`)

  return {
    metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: env.NEXT_PUBLIC_APP_NAME,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  }
}

export default async function MicroSitePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const site = await getPublicMicroSite(slug)
  if (!site) notFound()

  const leadMagnets = await listPublicLeadMagnets(site.professional.id)

  const { style } = resolveTheme(site.theme, site.sections.branding)

  const url = absoluteUrl(`/${slug}`)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: site.professional.fullName,
    description:
      site.seoDescription ||
      site.sections.sections.hero.subheadline ||
      site.professional.bio ||
      undefined,
    url,
    image:
      site.sections.branding.logo_url || site.professional.avatarUrl || undefined,
    areaServed: site.professional.locale || undefined,
    sameAs: Object.values(site.socialLinks ?? {}).filter(
      (link): link is string => typeof link === "string" && link.length > 0,
    ),
    makesOffer: site.services.map((s) => ({
      "@type": "Offer",
      name: s.name,
      description: s.description ?? undefined,
      price: s.price ?? undefined,
      priceCurrency: s.currency,
    })),
  }

  const renderers: Record<MicroSiteSectionType, () => React.ReactNode> = {
    hero: () => (
      <HeroSection
        section={site.sections.sections.hero}
        branding={site.sections.branding}
        professional={site.professional}
      />
    ),
    about: () => (
      <AboutSection
        section={site.sections.sections.about}
        professional={site.professional}
      />
    ),
    services: () => (
      <ServicesSection
        section={site.sections.sections.services}
        services={site.services}
        locale={site.professional.locale}
      />
    ),
    testimonials: () => (
      <TestimonialsSection section={site.sections.sections.testimonials} />
    ),
    faq: () => <FaqSection section={site.sections.sections.faq} />,
    contact: () => (
      <ContactSection section={site.sections.sections.contact} slug={slug} />
    ),
    blog: () => <BlogSection section={site.sections.sections.blog} />,
    niche: () => (
      <NichePlaceholderSection section={site.sections.sections.niche} />
    ),
  }

  return (
    <div className="ms-root" style={style}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {site.sections.order.map((sectionType) => {
        const render = renderers[sectionType]
        if (!render) return null
        return <div key={sectionType}>{render()}</div>
      })}
      {leadMagnets.length > 0 && (
        <LeadMagnetsSection magnets={leadMagnets} slug={slug} />
      )}
      <MicroSiteFooter
        professional={site.professional}
        socialLinks={site.socialLinks}
      />
    </div>
  )
}
