import { Receipt } from "lucide-react"

import { EmptyState, PageHeader } from "@/components/shared/page-header"

export default function InvoicesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Invoices"
        description="Track billing status for every engagement — no payment processing here."
      />
      <EmptyState
        icon={<Receipt />}
        title="Invoice tracking coming soon"
        description="Issue, mark paid, and export invoices in a future session."
      />
    </div>
  )
}
