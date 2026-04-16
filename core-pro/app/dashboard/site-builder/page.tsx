import { Globe } from "lucide-react"

import { EmptyState, PageHeader } from "@/components/shared/page-header"

export default function SiteBuilderPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Site builder"
        description="Publish a branded micro-site for your practice at yourname.corepro.app."
      />
      <EmptyState
        icon={<Globe />}
        title="Micro-site editor coming soon"
        description="Pick a template, add your services, and publish — arriving in a later session."
      />
    </div>
  )
}
