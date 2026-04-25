import "server-only"

import { getProfessional } from "@/lib/db/queries/professionals"
import type { IntegrationsConfig } from "@/types/domain"

import type { ServiceContext } from "../_lib/context"
import { UnauthorizedError } from "../_lib/errors"
import {
  cleanUndefined,
  getExistingSettings,
  upsertProfessionalSettings,
} from "./_lib"

export type UpdateIntegrationsInput = {
  zoom?: {
    enabled: boolean
    account_email?: string
  }
  google_meet?: {
    enabled: boolean
    account_email?: string
  }
}

export type UpdateIntegrationsResult = {
  integrations: IntegrationsConfig
}

export async function updateIntegrations(
  _ctx: ServiceContext,
  input: UpdateIntegrationsInput,
): Promise<UpdateIntegrationsResult> {
  const professional = await getProfessional()
  if (!professional) throw new UnauthorizedError()

  const existing = (await getExistingSettings(professional.id)).integrations
  const next: IntegrationsConfig = {
    ...existing,
    ...cleanUndefined(input),
  }

  await upsertProfessionalSettings(professional.id, { integrations: next })

  return { integrations: next }
}
