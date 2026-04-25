import "server-only"

import { getOwnMicroSite, isSlugAvailable } from "@/lib/db/queries/micro-sites"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError } from "../_lib/errors"

export type CheckSlugAvailabilityInput = { slug: string }

export type CheckSlugAvailabilityResult = { available: boolean }

export async function checkSlugAvailability(
  _ctx: ServiceContext,
  input: CheckSlugAvailabilityInput,
): Promise<CheckSlugAvailabilityResult> {
  const site = await getOwnMicroSite()
  if (!site) throw new NotFoundError("No site to check against yet.")
  const available = await isSlugAvailable(input.slug, site.id)
  return { available }
}
