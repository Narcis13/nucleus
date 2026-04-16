import { redirect } from "next/navigation"

import { SiteBuilderEditor } from "@/components/dashboard/site-builder/editor"
import { PageHeader } from "@/components/shared/page-header"
import { withRLS } from "@/lib/db/rls"
import {
  AVAILABLE_THEMES,
  defaultMicroSiteConfig,
  ensureMicroSite,
  normalizeConfig,
} from "@/lib/db/queries/micro-sites"
import { getProfessional } from "@/lib/db/queries/professionals"
import { services } from "@/lib/db/schema"
import { env } from "@/lib/env"
import type { MicroSiteSocialLinks, MicroSiteTheme } from "@/types/domain"
import { asc, eq } from "drizzle-orm"

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard → Site Builder
//
// Loads the professional's micro_site row (creating one on first visit so the
// editor has something to bind to), plus their active services for the live
// preview, and hands everything off to a client island. All mutations go
// through server actions in `lib/actions/micro-sites.ts`.
// ─────────────────────────────────────────────────────────────────────────────
export default async function SiteBuilderPage() {
  const professional = await getProfessional()
  if (!professional) redirect("/onboarding")

  const site = await ensureMicroSite({
    professionalId: professional.id,
    fullName: professional.fullName,
  })

  // Services feed the live preview — mirrors what the public page will show.
  const serviceRows = await withRLS(async (tx) => {
    return tx
      .select({
        id: services.id,
        name: services.name,
        description: services.description,
        price: services.price,
        currency: services.currency,
        durationMinutes: services.durationMinutes,
      })
      .from(services)
      .where(eq(services.isActive, true))
      .orderBy(asc(services.name))
  })

  const initialConfig =
    site.sections == null
      ? defaultMicroSiteConfig()
      : normalizeConfig(site.sections)
  const publicUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/${site.slug}`

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Site builder"
        description="Configure the sections, theme, and SEO for your public micro-site."
      />
      <SiteBuilderEditor
        initialSite={{
          id: site.id,
          slug: site.slug,
          theme: (site.theme as MicroSiteTheme) ?? "default",
          isPublished: site.isPublished,
          seoTitle: site.seoTitle ?? "",
          seoDescription: site.seoDescription ?? "",
          socialLinks: (site.socialLinks as MicroSiteSocialLinks | null) ?? {},
          config: initialConfig,
        }}
        themes={AVAILABLE_THEMES}
        professional={{
          fullName: professional.fullName,
          bio: professional.bio,
          avatarUrl: professional.avatarUrl,
          certifications: professional.certifications,
          specialization: professional.specialization,
          locale: professional.locale,
          currency: professional.currency,
        }}
        services={serviceRows}
        publicUrl={publicUrl}
      />
    </div>
  )
}
