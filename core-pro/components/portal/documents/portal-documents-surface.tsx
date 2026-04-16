"use client"

import { Plus } from "lucide-react"
import { useState } from "react"

import { DocumentList, type DocumentListRow } from "@/components/shared/documents/document-list"
import { DocumentUpload } from "@/components/shared/documents/document-upload"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// ─────────────────────────────────────────────────────────────────────────────
// <PortalDocumentsSurface>
//
// Client-facing documents surface. Two buckets:
//   - Shared by professional — read-only download/preview.
//   - Uploaded by client     — client can delete their own uploads.
// ─────────────────────────────────────────────────────────────────────────────
export function PortalDocumentsSurface({
  documents,
  clientId,
}: {
  documents: DocumentListRow[]
  clientId: string | null
}) {
  const [uploadOpen, setUploadOpen] = useState(false)

  // Rows without an uploaded_by === client are treated as "shared by
  // professional". Rows the client uploaded themselves show under "your
  // uploads". We flag via uploadedBy matching clientId.
  const shared = documents.filter((d) => d.uploadedBy !== clientId)
  const mine = documents.filter((d) => d.uploadedBy === clientId)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end">
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger
            render={
              <Button size="sm">
                <Plus className="size-3.5" />
                Upload file
              </Button>
            }
          />
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload a file</DialogTitle>
              <DialogDescription>
                Your professional will be able to see anything you upload here.
              </DialogDescription>
            </DialogHeader>
            <DocumentUpload mode="client" />
          </DialogContent>
        </Dialog>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-heading text-sm font-semibold text-foreground">
          Shared with you
        </h2>
        <DocumentList
          documents={shared}
          mode="client"
          emptyState={
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nothing shared yet. Documents your professional sends will appear
              here.
            </div>
          }
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-heading text-sm font-semibold text-foreground">
          Your uploads
        </h2>
        <DocumentList
          documents={mine}
          mode="client"
          emptyState={
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Anything you upload will show up here.
            </div>
          }
        />
      </section>
    </div>
  )
}
