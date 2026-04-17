import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { getProfessional } from "@/lib/db/queries/professionals"
import { getClients } from "@/lib/db/queries/clients"
import { professionalSettings } from "@/lib/db/schema"
import type { GdprSettings } from "@/types/domain"

import { GdprSettingsForm } from "./form"

export const dynamic = "force-dynamic"

export default async function GdprSettingsPage() {
  const professional = await getProfessional()
  if (!professional) redirect("/sign-in?redirect_url=/dashboard/settings/gdpr")

  const [rows, clients] = await Promise.all([
    dbAdmin
      .select({ gdprSettings: professionalSettings.gdprSettings })
      .from(professionalSettings)
      .where(eq(professionalSettings.professionalId, professional.id))
      .limit(1),
    getClients(),
  ])

  const gdprSettings: GdprSettings =
    (rows[0]?.gdprSettings as GdprSettings | null) ?? {}

  return (
    <GdprSettingsForm
      initial={gdprSettings}
      clients={clients.map((c) => ({
        id: c.client.id,
        name: c.client.fullName,
        email: c.client.email,
      }))}
    />
  )
}
