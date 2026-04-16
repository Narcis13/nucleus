import { Home } from "lucide-react"

import { EmptyState, PageHeader } from "@/components/shared/page-header"

export default function PortalHomePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Welcome back"
        description="Your upcoming sessions, messages, and latest updates will live here."
      />
      <EmptyState
        icon={<Home />}
        title="Your portal is ready"
        description="As your professional shares documents, forms, or messages with you, they'll appear on this page."
      />
    </div>
  )
}
