import "server-only"

import { getProfessional } from "@/lib/db/queries/professionals"

import type { ServiceContext } from "../_lib/context"
import { PlanLimitError, UnauthorizedError } from "../_lib/errors"
import { MARKETING_BUCKET, resolvePlanLimits, sanitizeFilename } from "./_lib"

export type PrepareLeadMagnetUploadInput = {
  filename: string
  fileSize: number
  fileType?: string
}

export type PrepareLeadMagnetUploadResult = {
  storageKey: string
  bucket: string
}

export async function prepareLeadMagnetUpload(
  _ctx: ServiceContext,
  input: PrepareLeadMagnetUploadInput,
): Promise<PrepareLeadMagnetUploadResult> {
  const professional = await getProfessional()
  if (!professional) throw new UnauthorizedError("Complete onboarding first.")
  const limits = resolvePlanLimits(professional.planLimits, professional.plan)
  if (!limits.features?.includes("marketing_kit")) {
    throw new PlanLimitError("Your plan doesn't include lead magnets.")
  }
  const key = `${professional.id}/lead-magnets/${crypto.randomUUID()}-${sanitizeFilename(input.filename)}`
  return { storageKey: key, bucket: MARKETING_BUCKET }
}
