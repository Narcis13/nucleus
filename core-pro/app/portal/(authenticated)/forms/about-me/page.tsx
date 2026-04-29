import { FileText } from "lucide-react"

import { SurveysAboutMeList } from "@/components/portal/forms/about-me-list"
import { EmptyState, PageHeader } from "@/components/shared/page-header"
import { getResponsesAboutClient } from "@/lib/db/queries/forms"
import { requirePortalSession } from "@/lib/portal-auth/session"

// ─────────────────────────────────────────────────────────────────────────────
// /portal/forms/about-me
//
// Surveys submitted *about* the current client (e.g. property viewer
// feedback for an apartment owner). Read-only: the owner did not submit
// these responses, they're attributed to them via subject_client_id.
// ─────────────────────────────────────────────────────────────────────────────
export default async function PortalAboutMeFormsPage() {
  const session = await requirePortalSession()
  const items = await getResponsesAboutClient(session.clientId)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Responses about you"
        description="Surveys submitted by people your professional invited — for example, viewers of your property."
      />
      {items.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="No responses yet"
          description="When someone submits a survey about you, it will show up here."
        />
      ) : (
        <SurveysAboutMeList items={items} />
      )}
    </div>
  )
}
