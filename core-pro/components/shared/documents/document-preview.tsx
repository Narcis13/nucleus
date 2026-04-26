"use client"

import { AlertTriangle, FileText, Loader2 } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useEffect, useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getInlineDocumentUrlAction,
  portalGetInlineDocumentUrlAction,
} from "@/lib/actions/documents"
import type { Document } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// <DocumentPreview>
//
// Modal preview for images and PDFs. For anything else we fall back to a
// neutral "Download to view" card. URL comes from a fresh signed link (60 min)
// so the file stays private.
// ─────────────────────────────────────────────────────────────────────────────
export function DocumentPreview({
  document,
  open,
  onOpenChange,
  mode = "professional",
}: {
  document: Document | null
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: "professional" | "client"
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inline = useAction(
    mode === "client"
      ? portalGetInlineDocumentUrlAction
      : getInlineDocumentUrlAction,
  )

  useEffect(() => {
    setUrl(null)
    setError(null)
    if (!open || !document) return
    let cancelled = false
    inline
      .executeAsync({ id: document.id })
      .then((res) => {
        if (cancelled) return
        if (res?.data?.url) {
          setUrl(res.data.url)
        } else {
          setError(res?.serverError ?? "Couldn't load preview.")
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Couldn't load preview.")
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, document?.id, mode])

  if (!document) return null

  const kind = detectKind(document.fileType ?? "", document.name)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{document.name}</DialogTitle>
          <DialogDescription>
            {document.category ?? "General"} ·{" "}
            {document.fileSize ? formatBytes(document.fileSize) : "—"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-[40vh] items-center justify-center overflow-hidden rounded-md border border-border bg-muted/30">
          {error ? (
            <div className="flex flex-col items-center gap-2 p-6 text-center text-destructive">
              <AlertTriangle className="size-5" />
              <p className="text-sm">{error}</p>
            </div>
          ) : !url ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <p className="text-xs">Signing link…</p>
            </div>
          ) : kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={document.name}
              className="max-h-[70vh] w-auto object-contain"
            />
          ) : kind === "pdf" ? (
            <iframe
              src={url}
              title={document.name}
              className="h-[70vh] w-full"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 p-6 text-center">
              <FileText className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Preview isn&apos;t available for this file type.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                Download {document.name}
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

type PreviewKind = "image" | "pdf" | "other"

function detectKind(mime: string, name: string): PreviewKind {
  if (mime.startsWith("image/")) return "image"
  if (mime === "application/pdf" || /\.pdf$/i.test(name)) return "pdf"
  if (/\.(png|jpe?g|gif|webp|svg)$/i.test(name)) return "image"
  return "other"
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
