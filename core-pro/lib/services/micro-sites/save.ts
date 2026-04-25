import "server-only"

import {
  ensureMicroSite,
  isSlugAvailable,
  updateMicroSite,
} from "@/lib/db/queries/micro-sites"
import { getProfessional } from "@/lib/db/queries/professionals"
import type {
  MicroSiteConfig,
  MicroSiteSectionType,
  MicroSiteTheme,
} from "@/types/domain"

import type { ServiceContext } from "../_lib/context"
import { ServiceError, UnauthorizedError } from "../_lib/errors"

export type SaveMicroSiteInput = {
  slug?: string
  theme: MicroSiteTheme
  order: MicroSiteSectionType[]
  sections: MicroSiteConfig["sections"]
  branding: MicroSiteConfig["branding"]
  seoTitle?: string | null
  seoDescription?: string | null
  socialLinks?: {
    instagram?: string
    facebook?: string
    linkedin?: string
    twitter?: string
    youtube?: string
    tiktok?: string
    website?: string
  }
}

export type SaveMicroSiteResult = { id: string; slug: string }

export async function saveMicroSite(
  _ctx: ServiceContext,
  input: SaveMicroSiteInput,
): Promise<SaveMicroSiteResult> {
  const professional = await getProfessional()
  if (!professional) {
    throw new UnauthorizedError("Complete onboarding first.")
  }

  const site = await ensureMicroSite({
    professionalId: professional.id,
    fullName: professional.fullName,
  })

  if (input.slug && input.slug !== site.slug) {
    const available = await isSlugAvailable(input.slug, site.id)
    if (!available) {
      throw new ServiceError("That slug is already taken.")
    }
  }

  const sectionsJson: MicroSiteConfig = {
    order: input.order,
    sections: input.sections,
    branding: input.branding,
  }

  const updated = await updateMicroSite({
    slug: input.slug ?? site.slug,
    theme: input.theme,
    sections: sectionsJson,
    seoTitle: input.seoTitle ?? null,
    seoDescription: input.seoDescription ?? null,
    socialLinks: input.socialLinks ?? null,
  })
  if (!updated) throw new ServiceError("Couldn't save site.")

  return { id: updated.id, slug: updated.slug }
}
