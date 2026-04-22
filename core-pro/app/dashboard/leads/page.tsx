import { redirect } from "next/navigation"

import { LeadsPipeline } from "@/components/dashboard/leads/leads-pipeline"
import {
  ensureDefaultStages,
  getActivitiesForLeads,
  getLeads,
} from "@/lib/db/queries/leads"
import { getProfessional } from "@/lib/db/queries/professionals"

export default async function LeadsPipelinePage() {
  const professional = await getProfessional()
  if (!professional) redirect("/onboarding")

  // Seed the default New → Won pipeline on first load. Subsequent loads
  // return the existing rows without inserting.
  const stages = await ensureDefaultStages()
  const leads = await getLeads()
  const activities = await getActivitiesForLeads(leads.map((l) => l.id))

  return (
    <LeadsPipeline stages={stages} leads={leads} activities={activities} />
  )
}
