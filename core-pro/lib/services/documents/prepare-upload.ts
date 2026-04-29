import "server-only"

import { getStorageUsedBytes } from "@/lib/db/queries/documents"
import { getProfessional } from "@/lib/db/queries/professionals"

import type { ServiceContext } from "../_lib/context"
import { PlanLimitError, UnauthorizedError } from "../_lib/errors"
import {
  BUCKET,
  buildStorageKey,
  mbToBytes,
  resolvePlanLimits,
} from "./_helpers"

export type PrepareDocumentUploadInput = {
  filename: string
  fileSize: number
  fileType?: string
  clientId?: string | null
}

export type PrepareDocumentUploadResult = {
  storageKey: string
  bucket: string
  usedBytes: number
  maxBytes: number
}

// Pre-flight check from the dashboard side: validates that the professional
// has plan-storage capacity for the incoming file, and returns the storage
// key the browser should upload to. The browser then does a direct upload via
// the Clerk-authed Supabase client (storage RLS lets it into its own folder).
export async function prepareDocumentUpload(
  _ctx: ServiceContext,
  input: PrepareDocumentUploadInput,
): Promise<PrepareDocumentUploadResult> {
  const professional = await getProfessional()
  if (!professional) {
    throw new UnauthorizedError(
      "Complete onboarding before uploading documents.",
    )
  }
  const limits = resolvePlanLimits(professional.planLimits, professional.plan)
  const used = await getStorageUsedBytes()
  const maxBytes = mbToBytes(limits.max_storage_mb)
  if (used + input.fileSize > maxBytes) {
    throw new PlanLimitError(
      `Storage limit reached (${limits.max_storage_mb} MB). Upgrade your plan to upload more files.`,
    )
  }
  const storageKey = buildStorageKey({
    professionalId: professional.id,
    clientId: input.clientId ?? null,
    filename: input.filename,
  })
  return {
    storageKey,
    bucket: BUCKET,
    usedBytes: used,
    maxBytes,
  }
}
