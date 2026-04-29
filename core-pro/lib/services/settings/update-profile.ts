import "server-only"

import { updateProfessional } from "@/lib/db/queries/professionals"

import type { ServiceContext } from "../_lib/context"
import { ServiceError } from "../_lib/errors"
import { cleanUndefined } from "./_lib"

export type UpdateProfileInput = {
  fullName: string
  bio?: string | null
  phone?: string | null
  avatarUrl?: string | null
  specialization?: string[]
  certifications?: string[]
  timezone?: string
  locale?: string
  currency?: string
}

export type UpdateProfileResult = {
  professional: Awaited<ReturnType<typeof updateProfessional>>
}

export async function updateProfile(
  _ctx: ServiceContext,
  input: UpdateProfileInput,
): Promise<UpdateProfileResult> {
  const patch = cleanUndefined(input)
  const updated = await updateProfessional(patch)
  if (!updated) throw new ServiceError("Couldn't update profile")
  return { professional: updated }
}
