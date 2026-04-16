import { Megaphone } from "lucide-react"

import { EmptyState, PageHeader } from "@/components/shared/page-header"

export default function MarketingKitPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Marketing"
        description="Assets, templates, and campaigns to grow your book of business."
      />
      <EmptyState
        icon={<Megaphone />}
        title="Marketing kit coming soon"
        description="Email templates, shareable graphics, and referral tracking arrive later."
      />
    </div>
  )
}
