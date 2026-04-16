import { Users } from "lucide-react"

import { ClientTable } from "@/components/dashboard/clients/client-table"
import { EmptyState, PageHeader } from "@/components/shared/page-header"
import { getClients, getTags } from "@/lib/db/queries/clients"

export default async function ClientsListPage() {
  // Fetched in parallel — both queries run inside their own RLS transactions.
  const [clients, tags] = await Promise.all([getClients(), getTags()])

  if (clients.length === 0 && tags.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Clients"
          description="Search, filter, and manage everyone you're working with."
        />
        <EmptyState
          icon={<Users />}
          title="No clients yet"
          description="Add your first client — they can be invited to the portal right away."
        />
        <ClientTable initialClients={clients} tags={tags} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clients"
        description={`${clients.length} ${clients.length === 1 ? "client" : "clients"} in your workspace.`}
      />
      <ClientTable initialClients={clients} tags={tags} />
    </div>
  )
}
