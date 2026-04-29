import "server-only"

import { eq } from "drizzle-orm"

import { getCurrentProfessionalId } from "@/lib/clerk/helpers"
import { dbAdmin } from "@/lib/db/client"
import { clientSettings, professionalClients } from "@/lib/db/schema"
import type { ConsentRecord } from "@/types/domain"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError, UnauthorizedError } from "../_lib/errors"

export type UpdateClientConsentInput = {
  clientId: string
  consent: "marketing_emails" | "data_sharing" | "analytics" | "processing"
  granted: boolean
}

export type UpdateClientConsentResult = {
  consent: ConsentRecord
}

export async function updateClientConsent(
  _ctx: ServiceContext,
  input: UpdateClientConsentInput,
): Promise<UpdateClientConsentResult> {
  const professionalId = await getCurrentProfessionalId()
  if (!professionalId) throw new UnauthorizedError()

  const link = await dbAdmin
    .select({ id: professionalClients.id })
    .from(professionalClients)
    .where(eq(professionalClients.clientId, input.clientId))
    .limit(1)
  if (!link[0]) throw new NotFoundError("Client not found")

  const rows = await dbAdmin
    .select({ metadata: clientSettings.metadata })
    .from(clientSettings)
    .where(eq(clientSettings.clientId, input.clientId))
    .limit(1)
  const existing = (rows[0]?.metadata ?? {}) as Record<string, unknown>
  const log = Array.isArray(existing.consents)
    ? (existing.consents as ConsentRecord[])
    : []
  const record: ConsentRecord = {
    consent: input.consent,
    granted: input.granted,
    recordedAt: new Date().toISOString(),
  }
  const nextMetadata = { ...existing, consents: [...log, record] }

  await dbAdmin
    .insert(clientSettings)
    .values({
      clientId: input.clientId,
      metadata: nextMetadata,
    })
    .onConflictDoUpdate({
      target: clientSettings.clientId,
      set: { metadata: nextMetadata, updatedAt: new Date() },
    })

  return { consent: record }
}
