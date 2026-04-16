import { BarChart3 } from "lucide-react"

import { EmptyState, PageHeader } from "@/components/shared/page-header"

export default function DashboardHomePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Your practice at a glance — KPIs, upcoming appointments, and recent activity."
      />
      <EmptyState
        icon={<BarChart3 />}
        title="Your insights will appear here"
        description="KPI cards, the activity feed, and today's schedule light up once you've onboarded your first clients and services."
      />
    </div>
  )
}
