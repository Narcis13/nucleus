import { BarChart3 } from "lucide-react"

import { EmptyState, PageHeader } from "@/components/shared/page-header"

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Analytics"
        description="Dashboards and reports across your clients, revenue, and engagement."
      />
      <EmptyState
        icon={<BarChart3 />}
        title="Reports coming soon"
        description="Cohort retention, revenue breakdowns, and exportable reports land in a later session."
      />
    </div>
  )
}
