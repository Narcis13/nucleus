import { auth } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"
import { FolderOpen } from "lucide-react"

import { PortalDocumentsSurface } from "@/components/portal/documents/portal-documents-surface"
import { EmptyState, PageHeader } from "@/components/shared/page-header"
import { dbAdmin } from "@/lib/db/client"
import { getDocuments } from "@/lib/db/queries/documents"
import { clients } from "@/lib/db/schema"

export default async function PortalDocumentsPage() {
  const { userId } = await auth()
  const clientRow = userId
    ? (
        await dbAdmin
          .select({ id: clients.id })
          .from(clients)
          .where(eq(clients.clerkUserId, userId))
          .limit(1)
      )[0] ?? null
    : null

  // RLS on documents scopes to (a) rows owned by the pro, (b) rows linked to
  // this client via `documents_client_select`. The portal user is side (b).
  const documents = await getDocuments()

  if (documents.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Documents"
          description="Download files your professional shares and upload anything they've asked you to send."
        />
        <PortalDocumentsSurface
          documents={[]}
          clientId={clientRow?.id ?? null}
        />
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
        clientId={clientRow?.id ?? null}
      />
    </div>
  )
}
