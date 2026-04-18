import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { getProfessional } from "@/lib/db/queries/professionals"
import { professionalSettings } from "@/lib/db/schema"
import type { IntegrationsConfig } from "@/types/domain"

import { IntegrationsForm } from "./form"

export const dynamic = "force-dynamic"

export default async function IntegrationsSettingsPage() {
  const professional = await getProfessional()
  if (!professional) {
    redirect("/onboarding")
  }

  const rows = await dbAdmin
    .select({ integrations: professionalSettings.integrations })
    .from(professionalSettings)
    .where(eq(professionalSettings.professionalId, professional.id))
    .limit(1)
  const integrations: IntegrationsConfig =
    (rows[0]?.integrations as IntegrationsConfig | null) ?? {}

  return <IntegrationsForm initial={integrations} />
}
