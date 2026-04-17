import { redirect } from "next/navigation"

import { getProfessional } from "@/lib/db/queries/professionals"
import type { Branding } from "@/types/domain"

import { BrandingForm } from "./form"

export const dynamic = "force-dynamic"

export default async function BrandingSettingsPage() {
  const professional = await getProfessional()
  if (!professional) {
    redirect("/sign-in?redirect_url=/dashboard/settings/branding")
  }

  return (
    <BrandingForm
      professional={{
        id: professional.id,
        fullName: professional.fullName,
        plan: professional.plan,
        avatarUrl: professional.avatarUrl,
      }}
      initialBranding={(professional.branding as Branding | null) ?? {}}
    />
  )
}
