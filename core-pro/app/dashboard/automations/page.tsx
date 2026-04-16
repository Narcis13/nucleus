import { Zap } from "lucide-react"

import { EmptyState, PageHeader } from "@/components/shared/page-header"

export default function AutomationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Automations"
        description="Triggers, actions, and reusable playbooks that do the follow-up for you."
      />
      <EmptyState
        icon={<Zap />}
        title="Workflow engine coming soon"
        description="Build trigger→action flows and email sequences once the automations session ships."
      />
    </div>
  )
}
