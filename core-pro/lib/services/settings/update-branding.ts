import "server-only"

import {
  getProfessional,
  updateProfessional,
} from "@/lib/db/queries/professionals"
import type { Branding } from "@/types/domain"

import type { ServiceContext } from "../_lib/context"
import { ServiceError, UnauthorizedError } from "../_lib/errors"
import { cleanUndefined } from "./_lib"

export type UpdateBrandingInput = {
  primary_color?: string
  secondary_color?: string
  font?: string
  logo_url?: string | null
}

export type UpdateBrandingResult = {
  branding: Branding
}

export async function updateBranding(
  _ctx: ServiceContext,
  input: UpdateBrandingInput,
): Promise<UpdateBrandingResult> {
  const professional = await getProfessional()
  if (!professional) throw new UnauthorizedError()

  const nextBranding: Branding = {
    ...(professional.branding as Branding | null),
    ...cleanUndefined(input),
  }

  const updated = await updateProfessional({ branding: nextBranding })
  if (!updated) throw new ServiceError("Couldn't save branding")

  return { branding: nextBranding }
}
