import "server-only"

import { eq } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { withRLS } from "@/lib/db/rls"
import { professionalSettings } from "@/lib/db/schema"
import type {
  CalendarSync,
  GdprSettings,
  IntegrationsConfig,
} from "@/types/domain"

export const AVATAR_BUCKET = "avatars"
export const BRANDING_LOGO_BUCKET = "marketing"

export function cleanUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v
  }
  return out as T
}

export type ExistingSettings = {
  calendarSync: CalendarSync
  integrations: IntegrationsConfig
  gdprSettings: GdprSettings
}

export async function getExistingSettings(
  professionalId: string,
): Promise<ExistingSettings> {
  const rows = await dbAdmin
    .select({
      calendarSync: professionalSettings.calendarSync,
      integrations: professionalSettings.integrations,
      gdprSettings: professionalSettings.gdprSettings,
    })
    .from(professionalSettings)
    .where(eq(professionalSettings.professionalId, professionalId))
    .limit(1)
  return {
    calendarSync: (rows[0]?.calendarSync as CalendarSync | null) ?? {},
    integrations:
      (rows[0]?.integrations as IntegrationsConfig | null) ?? {},
    gdprSettings: (rows[0]?.gdprSettings as GdprSettings | null) ?? {},
  }
}

export async function upsertProfessionalSettings(
  professionalId: string,
  patch: Partial<{
    calendarSync: CalendarSync
    integrations: IntegrationsConfig
    gdprSettings: GdprSettings
  }>,
) {
  await withRLS(async (tx) => {
    await tx
      .insert(professionalSettings)
      .values({ professionalId, ...patch })
      .onConflictDoUpdate({
        target: professionalSettings.professionalId,
        set: { ...patch, updatedAt: new Date() },
      })
  })
}
