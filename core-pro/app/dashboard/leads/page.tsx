import { KanbanBoard } from "@/components/dashboard/leads/kanban-board"
import { StageManager } from "@/components/dashboard/leads/stage-manager"
import { PageHeader } from "@/components/shared/page-header"
import {
  ensureDefaultStages,
  getActivitiesForLeads,
  getLeads,
} from "@/lib/db/queries/leads"

export default async function LeadsPipelinePage() {
  // Seed the default New → Won pipeline on first load. Subsequent loads
  // return the existing rows without inserting.
  const stages = await ensureDefaultStages()
  const leads = await getLeads()
  const activities = await getActivitiesForLeads(leads.map((l) => l.id))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Leads"
        description={`${leads.length} ${leads.length === 1 ? "lead" : "leads"} across ${stages.length} ${stages.length === 1 ? "stage" : "stages"}.`}
        actions={<StageManager stages={stages} />}
      />
      <KanbanBoard stages={stages} leads={leads} activities={activities} />
    </div>
  )
}
