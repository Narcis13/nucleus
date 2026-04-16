import { FolderOpen } from "lucide-react"

import { DocumentsSurface } from "@/components/dashboard/documents/documents-surface"
import { EmptyState, PageHeader } from "@/components/shared/page-header"
import { getClients } from "@/lib/db/queries/clients"
import { getDocuments, getStorageUsedBytes } from "@/lib/db/queries/documents"
import { getProfessional } from "@/lib/db/queries/professionals"
import { getPlan, planLimitsFor } from "@/lib/stripe/plans"
import type { PlanLimits } from "@/types/domain"

export default async function DocumentsPage() {
  const [documents, clientList, professional] = await Promise.all([
    getDocuments(),
    getClients({ status: "active" }),
    getProfessional(),
  ])

  const limits = resolvePlanLimits(
    professional?.planLimits,
    professional?.plan,
  )
  const storageUsedBytes = await getStorageUsedBytes()
  const storageMaxBytes = limits.max_storage_mb * 1024 * 1024

  const clients = clientList.map((c) => ({
    id: c.client.id,
    fullName: c.client.fullName,
  }))

  if (documents.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Documents"
          description="Upload, share, and organise files with your clients."
        />
        <DocumentsSurface
          initialDocuments={documents}
          clients={clients}
          storageUsedBytes={storageUsedBytes}
          storageMaxBytes={storageMaxBytes}
        />
        <EmptyState
          icon={<FolderOpen />}
          title="No documents yet"
          description="Upload contracts, medical records, or anything else you need to keep organised per client."
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Documents"
        description={`${documents.length} ${documents.length === 1 ? "file" : "files"} · ${clients.length} clients available.`}
      />
      <DocumentsSurface
        initialDocuments={documents}
        clients={clients}
        storageUsedBytes={storageUsedBytes}
        storageMaxBytes={storageMaxBytes}
      />
    </div>
  )
}

function resolvePlanLimits(
  planLimits: unknown,
  planId: string | null | undefined,
): PlanLimits {
  if (planLimits && typeof planLimits === "object") {
    return planLimits as PlanLimits
  }
  return planLimitsFor(getPlan(planId))
}
