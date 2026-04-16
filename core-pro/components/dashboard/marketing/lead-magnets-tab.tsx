"use client"

import {
  Download,
  FileUp,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Eye,
  EyeOff,
} from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/shared/page-header"
import {
  createLeadMagnetAction,
  deleteLeadMagnetAction,
  prepareLeadMagnetUploadAction,
  updateLeadMagnetAction,
} from "@/lib/actions/marketing"
import { useSupabaseBrowser } from "@/lib/supabase/client"
import type { LeadMagnet } from "@/types/domain"

type Props = {
  magnets: LeadMagnet[]
}

export function LeadMagnetsTab({ magnets }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const deleteAction = useAction(deleteLeadMagnetAction, {
    onSuccess: () => {
      toast.success("Lead magnet removed.")
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't remove lead magnet.")
    },
  })

  const toggleAction = useAction(updateLeadMagnetAction, {
    onSuccess: () => router.refresh(),
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't update.")
    },
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Share free PDFs, checklists, or guides on your micro-site. Visitors
          exchange their email to download — the download creates a lead in
          your pipeline automatically.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button>
                <Plus className="size-4" /> Add lead magnet
              </Button>
            }
          />
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>New lead magnet</DialogTitle>
              <DialogDescription>
                Upload a file, give it a title and short description. It&apos;ll
                be available on your micro-site once published.
              </DialogDescription>
            </DialogHeader>
            <LeadMagnetCreator
              onDone={() => {
                setOpen(false)
                router.refresh()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {magnets.length === 0 ? (
        <EmptyState
          icon={<FileUp />}
          title="No lead magnets yet"
          description="Free PDFs, checklists, and mini-guides go here — great for capturing new leads from your micro-site."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {magnets.map((magnet) => (
            <Card key={magnet.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="truncate">{magnet.title}</span>
                  {magnet.isPublished ? (
                    <Badge variant="default">Published</Badge>
                  ) : (
                    <Badge variant="outline">Hidden</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {magnet.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {magnet.description}
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <Stat
                    label="File"
                    value={magnet.fileName}
                    className="col-span-3 truncate"
                  />
                  <Stat label="Size" value={formatBytes(magnet.fileSize)} />
                  <Stat
                    label="Downloads"
                    value={String(magnet.downloadCount)}
                  />
                  <Stat
                    label="Added"
                    value={new Date(magnet.createdAt).toLocaleDateString()}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toggleAction.execute({
                        id: magnet.id,
                        isPublished: !magnet.isPublished,
                      })
                    }
                    disabled={toggleAction.isPending}
                  >
                    {magnet.isPublished ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                    {magnet.isPublished ? "Hide" : "Publish"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Remove "${magnet.title}"?`)) {
                        deleteAction.execute({ id: magnet.id })
                      }
                    }}
                    disabled={deleteAction.isPending}
                  >
                    <Trash2 className="size-4" /> Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={className}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  )
}

function LeadMagnetCreator({ onDone }: { onDone: () => void }) {
  const supabase = useSupabaseBrowser()
  const inputRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const prepare = useAction(prepareLeadMagnetUploadAction)
  const create = useAction(createLeadMagnetAction)

  async function submit() {
    if (!title.trim()) {
      toast.error("Add a title.")
      return
    }
    if (!file) {
      toast.error("Pick a file.")
      return
    }
    setUploading(true)
    try {
      const prep = await prepare.executeAsync({
        filename: file.name,
        fileSize: file.size,
        fileType: file.type || undefined,
      })
      if (!prep?.data) {
        throw new Error(prep?.serverError ?? "Couldn't prepare upload.")
      }
      const { storageKey, bucket } = prep.data

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storageKey, file, {
          cacheControl: "86400",
          upsert: false,
          contentType: file.type || undefined,
        })
      if (uploadError) throw uploadError

      const res = await create.executeAsync({
        title: title.trim(),
        description: description.trim() || null,
        fileKey: storageKey,
        fileName: file.name,
        fileSize: file.size,
        isPublished: true,
      })
      if (!res?.data) {
        throw new Error(res?.serverError ?? "Couldn't save lead magnet.")
      }
      toast.success("Lead magnet added.")
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="magnet-title">Title</Label>
        <Input
          id="magnet-title"
          placeholder="e.g. 7-day kickstart plan"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="magnet-desc">Description (optional)</Label>
        <Textarea
          id="magnet-desc"
          rows={3}
          placeholder="One or two lines that sell the download."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>File</Label>
        <div className="rounded-lg border border-dashed p-4">
          <div className="flex items-center gap-3">
            <Upload className="size-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm">
                {file ? file.name : "PDFs, images, or zips up to 25MB."}
              </p>
              {file && (
                <p className="text-xs text-muted-foreground">
                  {formatBytes(file.size)}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
            >
              {file ? "Replace" : "Choose"}
            </Button>
          </div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const next = e.target.files?.[0]
              if (next) setFile(next)
            }}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onDone} disabled={uploading}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={uploading}>
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          {uploading ? "Uploading…" : "Publish"}
        </Button>
      </DialogFooter>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (!bytes) return "—"
  const units = ["B", "KB", "MB", "GB"]
  let value = bytes
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  return `${value.toFixed(value < 10 && index > 0 ? 1 : 0)} ${units[index]}`
}
