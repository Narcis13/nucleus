import Image from "next/image"

import type {
  MicroSiteBranding,
  MicroSiteHeroSection,
} from "@/types/domain"

// Section 1 — Hero
//
// Combines the professional's avatar/cover, tagline, and a single CTA. The
// CTA can jump to the contact form, the services list, or a fully custom URL.
// All colours read from CSS custom properties on the enclosing `.ms-root` so
// the same markup looks different under each theme.
export function HeroSection({
  section,
  branding,
  professional,
}: {
  section: MicroSiteHeroSection
  branding: MicroSiteBranding
  professional: {
    fullName: string
    bio: string | null
    avatarUrl: string | null
  }
}) {
  if (!section.enabled) return null

  const headline = section.headline || professional.fullName
  const subheadline =
    section.subheadline || branding.tagline || professional.bio || ""
  const ctaLabel = section.cta_label || "Get in touch"
  const ctaHref =
    section.cta_target === "services"
      ? "#services"
      : section.cta_target === "custom" && section.cta_href
        ? section.cta_href
        : "#contact"

  return (
    <section
      id="hero"
      className="relative overflow-hidden"
      style={{ background: "var(--ms-hero-bg)" }}
    >
      {branding.cover_url && (
        <div className="absolute inset-0 -z-10 opacity-60">
          <Image
            src={branding.cover_url}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
            unoptimized
          />
          <div
            className="absolute inset-0"
            style={{ background: "var(--ms-hero-bg)", opacity: 0.8 }}
          />
        </div>
      )}
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-8 px-6 py-20 md:py-28">
        {(branding.logo_url || professional.avatarUrl) && (
          <div
            className="relative size-20 overflow-hidden"
            style={{ borderRadius: "var(--ms-radius)" }}
          >
            <Image
              src={(branding.logo_url || professional.avatarUrl)!}
              alt={professional.fullName}
              fill
              sizes="80px"
              className="object-cover"
              unoptimized
            />
          </div>
        )}
        <div className="max-w-3xl space-y-4">
          <h1
            className="text-4xl font-semibold leading-tight tracking-tight md:text-6xl"
            style={{ fontFamily: "var(--ms-font-heading)" }}
          >
            {headline}
          </h1>
          {subheadline && (
            <p
              className="text-lg md:text-xl"
              style={{ color: "var(--ms-muted)" }}
            >
              {subheadline}
            </p>
          )}
        </div>
        {ctaLabel && (
          <a
            href={ctaHref}
            className="inline-flex items-center justify-center px-6 py-3 text-base font-medium shadow transition-transform hover:-translate-y-0.5"
            style={{
              backgroundColor: "var(--ms-primary)",
              color: "var(--ms-primary-fg)",
              borderRadius: "var(--ms-radius)",
              boxShadow: "var(--ms-shadow)",
            }}
          >
            {ctaLabel}
          </a>
        )}
      </div>
    </section>
  )
}
