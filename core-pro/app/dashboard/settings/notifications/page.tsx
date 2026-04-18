import { redirect } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { getCurrentUserRole } from "@/lib/clerk/helpers"
import { getProfessional } from "@/lib/db/queries/professionals"
import { getMyNotificationPreferences } from "@/lib/db/queries/notification-settings"
import { DEFAULT_PREFERENCES } from "@/lib/notifications/preferences"

import { NotificationPreferencesForm } from "./form"

// /dashboard/settings/notifications
//
// Per-type + per-channel + quiet-hours preferences for the signed-in
// professional. Loads the stored prefs server-side so the form is hydrated
// with saved values (no flash of defaults on first paint).
export default async function NotificationSettingsPage() {
  const role = await getCurrentUserRole()
  if (role !== "professional") redirect("/dashboard")

  const professional = await getProfessional()
  if (!professional) redirect("/onboarding")

  const stored = await getMyNotificationPreferences({
    userId: professional.id,
    userType: "professional",
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notification preferences"
        description="Pick what pings you, on which channel, and when to stay quiet."
      />
      <NotificationPreferencesForm
        initial={stored ?? DEFAULT_PREFERENCES}
      />
    </div>
  )
}
