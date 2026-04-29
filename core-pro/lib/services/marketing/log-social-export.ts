import "server-only"

import { getProfessional } from "@/lib/db/queries/professionals"

import type { ServiceContext } from "../_lib/context"
import { UnauthorizedError } from "../_lib/errors"

export type LogSocialExportInput = { id: string }
export type LogSocialExportResult = { ok: true; templateId: string }

// Export support is purely client-side (Canvas → PNG), but we expose a service
// so the UI can log the export event symmetrically with the other marketing
// flows. Nothing server-side needs to happen beyond acknowledgement.
export async function logSocialExport(
  _ctx: ServiceContext,
  input: LogSocialExportInput,
): Promise<LogSocialExportResult> {
  const professional = await getProfessional()
  if (!professional) throw new UnauthorizedError("Unauthorized")
  return { ok: true, templateId: input.id }
}
