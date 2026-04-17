import { redirect } from "next/navigation"

import { getProfessional } from "@/lib/db/queries/professionals"

import { ProfileForm } from "./form"

export const dynamic = "force-dynamic"

export default async function ProfileSettingsPage() {
  const professional = await getProfessional()
  if (!professional) redirect("/sign-in?redirect_url=/dashboard/settings/profile")

  return <ProfileForm professional={professional} />
}
