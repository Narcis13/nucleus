import { Zap } from "lucide-react"

import { AutomationsWorkspace } from "@/components/dashboard/automations/automations-workspace"
import { EmptyState, PageHeader } from "@/components/shared/page-header"
import { getTags } from "@/lib/db/queries/clients"
import { getForms } from "@/lib/db/queries/forms"
import { getStages } from "@/lib/db/queries/leads"
import {
  listAutomations,
  listRecentLogsForAutomations,
  listSampleTargets,
} from "@/lib/db/queries/automations"

export default async function AutomationsPage() {
  const [automations, tags, forms, stages, sampleTargets] = await Promise.all([
    listAutomations(),
    getTags(),
    getForms(),
    getStages(),
    listSampleTargets(),
  ])
  const recentLogs = await listRecentLogsForAutomations(
    automations.map((a) => a.automation.id),
    5,
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Automations"
        description="Trigger → action playbooks that handle the follow-up for you."
      />
      {automations.length === 0 ? (
        <AutomationsWorkspace
          automations={[]}
          recentLogs={[]}
          tags={tags.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
          forms={forms.map((f) => ({ id: f.id, title: f.title }))}
          stages={stages.map((s) => ({ id: s.id, name: s.name }))}
          sampleLeads={sampleTargets.leads}
          sampleClients={sampleTargets.clients}
          emptyState={
            <EmptyState
              icon={<Zap />}
              title="No automations yet"
              description="Start from a template — welcome sequences, lead nurture, re-engagement — or build your own."
            />
          }
        />
      ) : (
        <AutomationsWorkspace
          automations={automations.map((a) => ({
            id: a.automation.id,
            name: a.automation.name,
            triggerType: a.automation.triggerType,
            triggerConfig: a.automation.triggerConfig ?? {},
            actions: a.automation.actions,
            isActive: a.automation.isActive,
            createdAt: a.automation.createdAt.toISOString(),
            runs: a.runs,
            lastRunAt: a.lastRunAt ? a.lastRunAt.toISOString() : null,
          }))}
          recentLogs={recentLogs.map((l) => ({
            id: l.id,
            automationId: l.automationId,
            status: l.status ?? null,
            error: l.error ?? null,
            executedAt: l.executedAt.toISOString(),
          }))}
          tags={tags.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
          forms={forms.map((f) => ({ id: f.id, title: f.title }))}
          stages={stages.map((s) => ({ id: s.id, name: s.name }))}
          sampleLeads={sampleTargets.leads}
          sampleClients={sampleTargets.clients}
        />
      )}
    </div>
  )
}
