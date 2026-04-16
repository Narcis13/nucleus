"use client"

import { FileUp, Loader2, Upload, X } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useRef, useState } from "react"
import type { DragEvent } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createDocumentAction,
  DOCUMENT_CATEGORIES,
  portalCreateDocumentAction,
  portalPrepareDocumentUploadAction,
  prepareDocumentUploadAction,
} from "@/lib/actions/documents"
import { useSupabaseBrowser } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Client } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// <DocumentUpload>
//
// Drag & drop + click-to-pick uploader. Two-phase server round-trip:
//   1. Server action checks plan limits, returns storage key.
//   2. Browser uploads to Supabase Storage via the Clerk-authed client.
//   3. Server action creates the `documents` row.
//
// Supports both sides:
//   mode="professional" — clientId optional, category selectable
//   mode="client"       — portal upload, pinned to the current client/pro
// ─────────────────────────────────────────────────────────────────────────────

type Mode = "professional" | "client"

type Props = {
  mode: Mode
  // Professional-only: restrict uploads to a specific client (profile tab).
  clientId?: string | null
  clients?: Array<Pick<Client, "id" | "fullName">>
  onUploaded?: () => void
  className?: string
}

type QueueItem = {
  id: string
  file: File
  status: "queued" | "uploading" | "done" | "error"
  error?: string
  progress: number
}

export function DocumentUpload({
  mode,
  clientId: pinnedClientId,
  clients,
  onUploaded,
  className,
}: Props) {
  const supabase = useSupabaseBrowser()
  const inputRef = useRef<HTMLInputElement>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [dragging, setDragging] = useState(false)
  const [category, setCategory] = useState<string>("General")
  const [clientSelection, setClientSelection] = useState<string>(
    pinnedClientId ?? "none",
  )

  const prepareProAction = useAction(prepareDocumentUploadAction)
  const createProAction = useAction(createDocumentAction)
  const preparePortalAction = useAction(portalPrepareDocumentUploadAction)
  const createPortalAction = useAction(portalCreateDocumentAction)

  const uploading = queue.some((q) => q.status === "uploading")

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files)
    if (list.length === 0) return

    const items: QueueItem[] = list.map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: "queued",
      progress: 0,
    }))
    setQueue((prev) => [...prev, ...items])

    // Upload sequentially so a 2nd large file doesn't saturate the connection.
    for (const item of items) {
      await uploadOne(item)
    }
    onUploaded?.()
  }

  const uploadOne = async (item: QueueItem) => {
    setQueue((prev) =>
      prev.map((q) =>
        q.id === item.id ? { ...q, status: "uploading", progress: 10 } : q,
      ),
    )
    try {
      // Phase 1 — prepare storage key.
      let storageKey: string
      let bucket: string
      if (mode === "professional") {
        const prep = await prepareProAction.executeAsync({
          filename: item.file.name,
          fileSize: item.file.size,
          fileType: item.file.type || undefined,
          clientId:
            clientSelection === "none"
              ? null
              : (clientSelection as string),
        })
        if (!prep?.data) {
          throw new Error(prep?.serverError ?? "Couldn't prepare upload.")
        }
        storageKey = prep.data.storageKey
        bucket = prep.data.bucket
      } else {
        const prep = await preparePortalAction.executeAsync({
          filename: item.file.name,
          fileSize: item.file.size,
          fileType: item.file.type || undefined,
        })
        if (!prep?.data) {
          throw new Error(prep?.serverError ?? "Couldn't prepare upload.")
        }
        storageKey = prep.data.storageKey
        bucket = prep.data.bucket
      }

      // Phase 2 — direct upload to Supabase Storage.
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, progress: 40 } : q)),
      )
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storageKey, item.file, {
          cacheControl: "3600",
          upsert: false,
          contentType: item.file.type || undefined,
        })
      if (uploadError) throw uploadError

      // Phase 3 — persist metadata row.
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, progress: 80 } : q)),
      )
      if (mode === "professional") {
        const res = await createProAction.executeAsync({
          storageKey,
          name: item.file.name,
          fileSize: item.file.size,
          fileType: item.file.type || undefined,
          category,
          clientId:
            clientSelection === "none"
              ? null
              : (clientSelection as string),
        })
        if (!res?.data) {
          throw new Error(res?.serverError ?? "Upload saved but row failed.")
        }
      } else {
        const res = await createPortalAction.executeAsync({
          storageKey,
          name: item.file.name,
          fileSize: item.file.size,
          fileType: item.file.type || undefined,
        })
        if (!res?.data) {
          throw new Error(res?.serverError ?? "Upload saved but row failed.")
        }
      }

      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id ? { ...q, status: "done", progress: 100 } : q,
        ),
      )
      toast.success(`Uploaded ${item.file.name}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed."
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id ? { ...q, status: "error", error: message } : q,
        ),
      )
      toast.error(message)
    }
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== id))
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {mode === "professional" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v ?? "General")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pick a category" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!pinnedClientId && clients && (
            <div className="flex flex-col gap-1.5">
              <Label>Share with client</Label>
              <Select
                value={clientSelection}
                onValueChange={(v) => setClientSelection(v ?? "none")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="General (no client)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">General (no client)</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 text-center transition-colors",
          dragging && "border-primary bg-primary/5",
        )}
        role="button"
        tabIndex={0}
      >
        <Upload className="mb-2 size-6 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">
          Drop files here or click to browse
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {mode === "professional"
            ? "Up to 25 MB per file · PDFs, images, docs"
            : "Up to 25 MB per file"}
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files)
            e.target.value = ""
          }}
        />
      </div>

      {queue.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {queue.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              <FileUp className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-foreground">{item.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(item.file.size)}
                  {item.status === "error" && item.error
                    ? ` · ${item.error}`
                    : ""}
                </p>
                {item.status === "uploading" && (
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </div>
              <StatusBadge status={item.status} />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => removeFromQueue(item.id)}
                disabled={item.status === "uploading"}
              >
                <X className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {uploading && (
        <p className="text-xs text-muted-foreground">
          <Loader2 className="mr-1 inline size-3 animate-spin" />
          Uploading…
        </p>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: QueueItem["status"] }) {
  const label =
    status === "queued"
      ? "Queued"
      : status === "uploading"
        ? "Uploading"
        : status === "done"
          ? "Done"
          : "Failed"
  const tone =
    status === "done"
      ? "text-emerald-600"
      : status === "error"
        ? "text-destructive"
        : "text-muted-foreground"
  return <span className={cn("text-xs", tone)}>{label}</span>
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
