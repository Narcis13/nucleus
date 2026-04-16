import { Briefcase } from "lucide-react"

import { EmptyState, PageHeader } from "@/components/shared/page-header"

export default function ServicesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Services"
        description="Define the offerings your clients can book or purchase."
      />
      <EmptyState
        icon={<Briefcase />}
        title="Services catalogue coming soon"
        description="Create, price, and schedule your offerings once SESSION 10 lands."
      />
    </div>
  )
}
