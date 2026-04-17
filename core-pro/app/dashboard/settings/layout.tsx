import { redirect } from "next/navigation"

import { getCurrentUserRole } from "@/lib/clerk/helpers"

import { SettingsNav } from "./_components/settings-nav"

// Shared layout for the settings module. Renders the tab navigation once and
// delegates the body to each sub-segment. Every tab is a dedicated sub-route so
// deep links + browser history + loading states all work out of the box; the
// tab strip just highlights the active one based on the pathname.
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const role = await getCurrentUserRole()
  if (role !== "professional" && role !== "admin") {
    redirect("/dashboard")
  }

  return (
    <div className="flex flex-col gap-6">
      <SettingsNav />
      <div className="min-h-[40vh]">{children}</div>
    </div>
  )
}
