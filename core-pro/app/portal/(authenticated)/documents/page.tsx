import { FolderOpen } from "lucide-react"

import { PortalDocumentsSurface } from "@/components/portal/documents/portal-documents-surface"
import { EmptyState, PageHeader } from "@/components/shared/page-header"
import { getPortalDocuments } from "@/lib/db/queries/portal"
import { requirePortalSession } from "@/lib/portal-auth/session"

export default async function PortalDocumentsPage() {
  const session = await requirePortalSession()
  const documents = await getPortalDocuments([session.clientId])

  if (documents.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Documents"
          description="Download files your professional shares and upload anything they've asked you to send."
        />
        <PortalDocumentsSurface documents={[]} clientId={session.clientId} />
        <EmptyState
          icon={<FolderOpen />}
          title="No documents yet"
          description="Documents your professional shares with you will show up here."
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Documents"
        description="Your files and anything your professional has shared with you."
      />
      <PortalDocumentsSurface
        documents={documents}
        clientId={session.clientId}
      />
    </div>
  )
}
