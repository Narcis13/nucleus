"use client"

import {
  Download,
  Eye,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  MoreHorizontal,
  Trash2,
  Users,
} from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { ReactNode } from "react"
import { toast } from "sonner"

import { DocumentPreview } from "@/components/shared/documents/document-preview"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  deleteDocumentAction,
  getSignedDocumentUrlAction,
  shareDocumentWithClientAction,
} from "@/lib/actions/documents"
import { cn } from "@/lib/utils"
import type { Client, Document } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// <DocumentList>
//
// Renders the table/list of documents. Acts as the shared surface for:
//   - /dashboard/documents  (professional, with client column + actions)
//   - /dashboard/clients/[id] documents tab  (filtered to one client)
//   - /portal/documents     (client view, scoped + limited actions)
// ─────────────────────────────────────────────────────────────────────────────

export type DocumentListRow = Document & {
  client?: Pick<Client, "id" | "fullName" | "avatarUrl"> | null
}

type Mode = "professional" | "client"

export function DocumentList({
  documents,
  mode,
  clients,
  className,
  emptyState,
}: {
  documents: DocumentListRow[]
  mode: Mode
  clients?: Array<Pick<Client, "id" | "fullName">>
  className?: string
  emptyState?: ReactNode
}) {
  const router = useRouter()
  const [previewing, setPreviewing] = useState<Document | null>(null)

  const downloadAction = useAction(getSignedDocumentUrlAction, {
    onSuccess: ({ data }) => {
      if (data?.url) {
        // Open in a new tab — signed URL already carries a `download=` param
        // so the browser treats it as an attachment.
        window.open(data.url, "_blank", "noopener,noreferrer")
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't get download link.")
    },
  })

  const deleteAction = useAction(deleteDocumentAction, {
    onSuccess: () => {
      toast.success("Document deleted.")
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't delete.")
    },
  })

  const shareAction = useAction(shareDocumentWithClientAction, {
    onSuccess: () => {
      toast.success("Sharing updated.")
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't update sharing.")
    },
  })

  if (documents.length === 0) {
    return <>{emptyState ?? <DefaultEmpty />}</>
  }

  return (
    <>
      <div className={cn("overflow-hidden rounded-lg border border-border", className)}>
        <ul className="divide-y divide-border bg-card">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40"
            >
              <FileIcon type={doc.fileType} name={doc.name} />
              <button
                type="button"
                onClick={() => setPreviewing(doc)}
                className="flex min-w-0 flex-1 flex-col items-start text-left"
              >
                <span className="truncate text-sm font-medium text-foreground">
                  {doc.name}
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {doc.category && <span>{doc.category}</span>}
                  <span>·</span>
                  <span>
                    {doc.fileSize ? formatBytes(doc.fileSize) : "—"}
                  </span>
                  <span>·</span>
                  <span>{formatDate(doc.createdAt)}</span>
                </span>
              </button>

              {mode === "professional" && doc.client && (
                <Badge variant="outline" className="gap-1">
                  <Users className="size-3" />
                  {doc.client.fullName}
                </Badge>
              )}

              {mode === "professional" && !doc.client && (
                <Badge variant="ghost">General</Badge>
              )}

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setPreviewing(doc)}
                  aria-label="Preview"
                >
                  <Eye className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => downloadAction.execute({ id: doc.id })}
                  disabled={downloadAction.isExecuting}
                  aria-label="Download"
                >
                  <Download className="size-3.5" />
                </Button>
                {mode === "professional" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="size-3.5" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      {clients && clients.length > 0 && (
                        <>
                          <DropdownMenuItem disabled className="text-xs">
                            Share with client
                          </DropdownMenuItem>
                          {doc.clientId && (
                            <DropdownMenuItem
                              onClick={() =>
                                shareAction.execute({
                                  id: doc.id,
                                  clientId: null,
                                })
                              }
                            >
                              — Unshare (make general)
                            </DropdownMenuItem>
                          )}
                          {clients.slice(0, 12).map((c) => (
                            <DropdownMenuItem
                              key={c.id}
                              onClick={() =>
                                shareAction.execute({
                                  id: doc.id,
                                  clientId: c.id,
                                })
                              }
                            >
                              {c.fullName}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete "${doc.name}"? This removes the file permanently.`,
                            )
                          ) {
                            deleteAction.execute({ id: doc.id })
                          }
                        }}
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {mode === "client" && doc.clientId && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete"
                    onClick={() => {
                      if (window.confirm(`Delete "${doc.name}"?`)) {
                        deleteAction.execute({ id: doc.id })
                      }
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <DocumentPreview
        document={previewing}
        open={previewing !== null}
        onOpenChange={(o) => !o && setPreviewing(null)}
      />
    </>
  )
}

function FileIcon({
  type,
  name,
}: {
  type: string | null | undefined
  name: string
}) {
  const mime = type ?? ""
  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(name)) {
    return <FileImage className="size-4 shrink-0 text-muted-foreground" />
  }
  if (mime === "application/pdf" || /\.pdf$/i.test(name)) {
    return <FileText className="size-4 shrink-0 text-destructive" />
  }
  if (/sheet|excel|csv/i.test(mime) || /\.(xlsx?|csv|numbers)$/i.test(name)) {
    return <FileSpreadsheet className="size-4 shrink-0 text-emerald-600" />
  }
  if (/zip|compressed/i.test(mime) || /\.(zip|rar|7z|tar|gz)$/i.test(name)) {
    return <FileArchive className="size-4 shrink-0 text-muted-foreground" />
  }
  return <FileType2 className="size-4 shrink-0 text-muted-foreground" />
}

function DefaultEmpty() {
  return (
    <div className="flex min-h-[20vh] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/10 p-6 text-center">
      <FileText className="mb-2 size-5 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">No documents yet</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Upload a file to get started.
      </p>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
