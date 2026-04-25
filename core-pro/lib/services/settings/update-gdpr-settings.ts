import "server-only"

import { getProfessional } from "@/lib/db/queries/professionals"
import type { GdprSettings } from "@/types/domain"

import type { ServiceContext } from "../_lib/context"
import { UnauthorizedError } from "../_lib/errors"
import {
  cleanUndefined,
  getExistingSettings,
  upsertProfessionalSettings,
} from "./_lib"

export type UpdateGdprSettingsInput = {
  retention_days?: number
  auto_delete_inactive?: boolean
  dpo_email?: string | null
  privacy_policy_url?: string | null
}

export type UpdateGdprSettingsResult = {
  gdprSettings: GdprSettings
}

export async function updateGdprSettings(
  _ctx: ServiceContext,
  input: UpdateGdprSettingsInput,
): Promise<UpdateGdprSettingsResult> {
  const professional = await getProfessional()
  if (!professional) throw new UnauthorizedError()

  const existing = (await getExistingSettings(professional.id)).gdprSettings
  const next: GdprSettings = {
    ...existing,
    ...cleanUndefined(input),
  }

  await upsertProfessionalSettings(professional.id, { gdprSettings: next })

  return { gdprSettings: next }
}
