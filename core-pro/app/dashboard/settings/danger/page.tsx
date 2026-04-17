import { redirect } from "next/navigation"

import { getProfessional } from "@/lib/db/queries/professionals"

import { DangerZone } from "./form"

export const dynamic = "force-dynamic"

export default async function DangerZonePage() {
  const professional = await getProfessional()
  if (!professional) redirect("/sign-in?redirect_url=/dashboard/settings/danger")

  return <DangerZone email={professional.email} fullName={professional.fullName} />
}
