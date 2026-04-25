import "server-only"

import { ensureMicroSite, updateMicroSite } from "@/lib/db/queries/micro-sites"
import { getProfessional } from "@/lib/db/queries/professionals"
import { trackServerEvent } from "@/lib/posthog/events"

import type { ServiceContext } from "../_lib/context"
import { ServiceError, UnauthorizedError } from "../_lib/errors"

export type PublishMicroSiteInput = { publish: boolean }

export type PublishMicroSiteResult = {
  id: string
  isPublished: boolean
  slug: string
}

export async function publishMicroSite(
  _ctx: ServiceContext,
  input: PublishMicroSiteInput,
): Promise<PublishMicroSiteResult> {
  const professional = await getProfessional()
  if (!professional) {
    throw new UnauthorizedError("Complete onboarding first.")
  }

  const site = await ensureMicroSite({
    professionalId: professional.id,
    fullName: professional.fullName,
  })

  const updated = await updateMicroSite({ isPublished: input.publish })
  if (!updated) throw new ServiceError("Couldn't update publish state.")

  // Only the publish transition matters for the funnel — unpublishing isn't
  // tracked. Firing on every toggle would skew the funnel with edit churn.
  if (input.publish) {
    void trackServerEvent("micro_site_published", {
      distinctId: professional.clerkUserId,
      professionalId: professional.id,
      plan: professional.plan,
      siteId: updated.id,
      slug: updated.slug,
    })
  }

  return { id: updated.id, isPublished: updated.isPublished, slug: site.slug }
}
