import "server-only"

import { getProfessional } from "@/lib/db/queries/professionals"
import { FEATURE_GATING_ENABLED, getPlan, planAtLeast } from "@/lib/stripe/plans"

import type { ServiceContext } from "../_lib/context"
import { PlanLimitError, UnauthorizedError } from "../_lib/errors"
import { BRANDING_LOGO_BUCKET } from "./_lib"

export type PrepareLogoUploadInput = {
  filename: string
  contentType: string
  fileSize: number
}

export type PrepareLogoUploadResult = {
  storageKey: string
  bucket: string
}

export async function prepareLogoUpload(
  _ctx: ServiceContext,
  input: PrepareLogoUploadInput,
): Promise<PrepareLogoUploadResult> {
  const professional = await getProfessional()
  if (!professional) throw new UnauthorizedError()
  const plan = getPlan(professional.plan)
  if (FEATURE_GATING_ENABLED && !planAtLeast(plan.id, "growth")) {
    throw new PlanLimitError("Upload a logo on the Growth plan or higher.")
  }
  const extMatch = input.filename.match(/\.([a-z0-9]+)$/i)
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : ""
  const storageKey = `${professional.id}/branding/logo-${crypto.randomUUID()}${ext}`
  return { storageKey, bucket: BRANDING_LOGO_BUCKET }
}
