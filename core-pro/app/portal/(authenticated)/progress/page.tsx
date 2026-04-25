import { TrendingUp } from "lucide-react"

import { EmptyState, PageHeader } from "@/components/shared/page-header"

export default function PortalProgressPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Progress"
        description="Track your journey — milestones, metrics, and notes your professional shares with you."
      />
      <EmptyState
        icon={<TrendingUp />}
        title="Progress tracking coming soon"
        description="Your professional will start logging milestones and shared metrics here as you work together."
      />
    </div>
  )
}
