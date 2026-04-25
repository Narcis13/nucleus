import "server-only"

import { eq } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { createLeadMagnet as createLeadMagnetQuery } from "@/lib/db/queries/marketing"
import { getProfessional } from "@/lib/db/queries/professionals"
import { leadMagnets } from "@/lib/db/schema"

import type { ServiceContext } from "../_lib/context"
import {
  PlanLimitError,
  ServiceError,
  UnauthorizedError,
} from "../_lib/errors"
import { maxLeadMagnetsForPlan } from "./_lib"

export type CreateLeadMagnetInput = {
  title: string
  description?: string | null
  fileKey: string
  fileName: string
  fileSize: number
  isPublished: boolean
}

export type CreateLeadMagnetResult = { id: string }

export async function createLeadMagnet(
  _ctx: ServiceContext,
  input: CreateLeadMagnetInput,
): Promise<CreateLeadMagnetResult> {
  const professional = await getProfessional()
  if (!professional) throw new UnauthorizedError("Complete onboarding first.")

  if (!input.fileKey.startsWith(`${professional.id}/`)) {
    throw new ServiceError("Invalid storage key.")
  }

  // Enforce per-plan cap — prevents one account from stashing hundreds of
  // gated files into the public bucket.
  const existing = await dbAdmin
    .select({ id: leadMagnets.id })
    .from(leadMagnets)
    .where(eq(leadMagnets.professionalId, professional.id))
  const cap = maxLeadMagnetsForPlan(professional.plan)
  if (existing.length >= cap) {
    throw new PlanLimitError(
      `Your plan allows up to ${cap} lead magnet${cap === 1 ? "" : "s"}.`,
    )
  }

  const created = await createLeadMagnetQuery({
    title: input.title,
    description: input.description ?? null,
    fileKey: input.fileKey,
    fileName: input.fileName,
    fileSize: input.fileSize,
    isPublished: input.isPublished,
  })

  return { id: created.id }
}
