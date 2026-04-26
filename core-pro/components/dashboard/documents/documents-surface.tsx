"use client"

import { Plus, Search, X } from "lucide-react"
import { useMemo, useState } from "react"

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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DOCUMENT_CATEGORIES } from "@/lib/constants/documents"
import { cn } from "@/lib/utils"
import type { Client } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// <DocumentsSurface>
//
// The top-level interactive surface on /dashboard/documents.
//   - Upload dialog (drag & drop or click to pick)
//   - Filters: search, client, category
//   - Storage usage meter
//   - Delegated list rendering to the shared <DocumentList>.
// ─────────────────────────────────────────────────────────────────────────────

const CLIENT_ALL = "__all__"
const CLIENT_GENERAL = "__general__"
const CATEGORY_ALL = "__all__"

export function DocumentsSurface({
  initialDocuments,
  clients,
  storageUsedBytes,
  storageMaxBytes,
}: {
  initialDocuments: DocumentListRow[]
  clients: Array<Pick<Client, "id" | "fullName">>
  storageUsedBytes: number
  storageMaxBytes: number
}) {
  const [search, setSearch] = useState("")
  const [clientFilter, setClientFilter] = useState<string>(CLIENT_ALL)
  const [categoryFilter, setCategoryFilter] = useState<string>(CATEGORY_ALL)
  const [uploadOpen, setUploadOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return initialDocuments.filter((d) => {
      if (q && !d.name.toLowerCase().includes(q)) return false
      if (clientFilter === CLIENT_GENERAL && d.clientId !== null) return false
      if (
        clientFilter !== CLIENT_ALL &&
        clientFilter !== CLIENT_GENERAL &&
        d.clientId !== clientFilter
      ) {
        return false
      }
      if (categoryFilter !== CATEGORY_ALL && d.category !== categoryFilter) {
        return false
      }
      return true
    })
  }, [initialDocuments, search, clientFilter, categoryFilter])

  const hasActiveFilter =
    search.trim().length > 0 ||
    clientFilter !== CLIENT_ALL ||
    categoryFilter !== CATEGORY_ALL

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <StorageMeter used={storageUsedBytes} max={storageMaxBytes} />
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger
            render={
              <Button size="sm">
                <Plus className="size-3.5" />
                Upload document
              </Button>
            }
          />
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Upload document</DialogTitle>
              <DialogDescription>
                Files are stored privately. Clients only see documents you
                share with them directly.
              </DialogDescription>
            </DialogHeader>
            <DocumentUpload
              mode="professional"
              clients={clients}
              onUploaded={() => {
                // Close after the first file finishes uploading (server
                // action revalidates the page so the new row appears).
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files…"
            className="pl-8"
          />
        </div>
        <Select
          value={clientFilter}
          onValueChange={(v) => setClientFilter(v ?? CLIENT_ALL)}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All clients">
              {(value: string | null) => {
                if (value === CLIENT_ALL || !value) return "All clients"
                if (value === CLIENT_GENERAL) return "General only"
                return (
                  clients.find((c) => c.id === value)?.fullName ?? "All clients"
                )
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CLIENT_ALL}>All clients</SelectItem>
            <SelectItem value={CLIENT_GENERAL}>General only</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={categoryFilter}
          onValueChange={(v) => setCategoryFilter(v ?? CATEGORY_ALL)}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CATEGORY_ALL}>All categories</SelectItem>
            {DOCUMENT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("")
              setClientFilter(CLIENT_ALL)
              setCategoryFilter(CATEGORY_ALL)
            }}
          >
            <X className="size-3.5" />
            Clear
          </Button>
        )}
      </div>

      <DocumentList documents={filtered} mode="professional" clients={clients} />
    </div>
  )
}

function StorageMeter({ used, max }: { used: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0
  const over = pct >= 90
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>
          Storage · <strong className="text-foreground">{formatBytes(used)}</strong>
          {" "}of{" "}<span>{formatBytes(max)}</span>
        </span>
        {over && (
          <span className="text-destructive">
            {pct.toFixed(0)}% used — upgrade soon
          </span>
        )}
      </div>
      <div className="h-1 w-full max-w-sm overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full transition-all",
            over ? "bg-destructive" : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
