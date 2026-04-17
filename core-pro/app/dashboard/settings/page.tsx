import type { Route } from "next"
import { redirect } from "next/navigation"

// The settings module is a multi-tab surface; the root page has no content of
// its own, so we redirect to the first tab. Keeping the entry at
// /dashboard/settings (rather than e.g. /dashboard/settings/profile) means
// "Settings" nav links from sidebars and breadcrumbs don't need to know about
// the default tab.
export default function SettingsIndexPage() {
  redirect("/dashboard/settings/profile" as Route)
}
