import { asc } from "drizzle-orm"
import { redirect } from "next/navigation"

import { MarketingWorkspace } from "@/components/dashboard/marketing/marketing-workspace"
import { PageHeader } from "@/components/shared/page-header"
import { withRLS } from "@/lib/db/rls"
import {
  listEmailCampaigns,
  listLeadMagnets,
  listSocialTemplates,
} from "@/lib/db/queries/marketing"
import { getProfessional } from "@/lib/db/queries/professionals"
import { tags } from "@/lib/db/schema"

export default async function MarketingKitPage() {
  const professional = await getProfessional()
  if (!professional) redirect("/onboarding")

  const [campaigns, templates, magnets, tagRows] = await Promise.all([
    listEmailCampaigns(),
    listSocialTemplates(),
    listLeadMagnets(),
    withRLS((tx) =>
      tx
        .select({ id: tags.id, name: tags.name, color: tags.color })
        .from(tags)
        .orderBy(asc(tags.name)),
    ),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Marketing"
        description="Email campaigns, shareable social graphics, and gated lead magnets — all in one place."
      />
      <MarketingWorkspace
        campaigns={campaigns}
        socialTemplates={templates}
        leadMagnets={magnets}
        professionalName={professional.fullName}
        professionalBrand={{
          primary: (professional.branding as { primary_color?: string } | null)?.primary_color ?? "#6366f1",
          secondary: (professional.branding as { secondary_color?: string } | null)?.secondary_color ?? "#f59e0b",
        }}
        tags={tagRows}
        plan={professional.plan}
      />
    </div>
  )
}
