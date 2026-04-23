"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowUpDown,
  Download,
  Filter,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Tag as TagIcon,
  X,
} from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  archiveClientAction,
  bulkAddTagAction,
  exportClientsAction,
} from "@/lib/actions/clients"
import { getOrCreateConversationAction } from "@/lib/actions/messages"
import type { ClientListItem } from "@/lib/db/queries/clients"
import type { Tag } from "@/types/domain"

import { ClientForm } from "./client-form"

// ─────────────────────────────────────────────────────────────────────────────
// <ClientTable>
//
// The dashboard/clients list surface. Server renders the initial rows; the
// client layer handles search, tag + status filtering, selection, and bulk
// actions. Server Actions are used for mutations (revalidatePath refreshes
// the server-rendered data).
// ─────────────────────────────────────────────────────────────────────────────

type SortKey = "name" | "created" | "status"
type SortDir = "asc" | "desc"

export function ClientTable({
  initialClients,
  tags,
}: {
  initialClients: ClientListItem[]
  tags: Tag[]
}) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortKey, setSortKey] = useState<SortKey>("created")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [addOpen, setAddOpen] = useState(false)

  const bulkTagAction = useAction(bulkAddTagAction, {
    onSuccess: ({ data }) => {
      toast.success(`Tag applied to ${data?.added ?? 0} clients.`)
      setSelected(new Set())
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't apply tag.")
    },
  })

  const archiveAction = useAction(archiveClientAction, {
    onSuccess: () => {
      toast.success("Client archived.")
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't archive client.")
    },
  })

  // Track which row is busy opening a conversation so only that button shows
  // a spinner — not every row.
  const [openingClientId, setOpeningClientId] = useState<string | null>(null)
  const openConversationAction = useAction(getOrCreateConversationAction, {
    onSuccess: ({ data }) => {
      setOpeningClientId(null)
      if (!data?.id) return
      router.push(`/dashboard/messages?c=${data.id}`)
    },
    onError: ({ error }) => {
      setOpeningClientId(null)
      toast.error(error.serverError ?? "Couldn't open conversation.")
    },
  })
  const openConversation = (clientId: string) => {
    setOpeningClientId(clientId)
    openConversationAction.execute({ clientId })
  }

  const exportAction = useAction(exportClientsAction, {
    onSuccess: ({ data }) => {
      if (!data) return
      const blob = new Blob([data.csv], { type: "text/csv;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = data.filename
      a.click()
      URL.revokeObjectURL(url)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't export CSV.")
    },
  })

  const rows = useMemo(() => {
    let list = initialClients
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (r) =>
          r.client.fullName.toLowerCase().includes(q) ||
          r.client.email.toLowerCase().includes(q) ||
          (r.client.phone ?? "").toLowerCase().includes(q),
      )
    }
    if (tagFilter.length > 0) {
      const set = new Set(tagFilter)
      list = list.filter((r) => r.tags.some((t) => set.has(t.id)))
    }
    if (statusFilter !== "all") {
      list = list.filter((r) => r.relationship.status === statusFilter)
    }
    const sorted = [...list].sort((a, b) => {
      let cmp = 0
      if (sortKey === "name") cmp = a.client.fullName.localeCompare(b.client.fullName)
      else if (sortKey === "status")
        cmp = a.relationship.status.localeCompare(b.relationship.status)
      else cmp = a.relationship.createdAt.getTime() - b.relationship.createdAt.getTime()
      return sortDir === "asc" ? cmp : -cmp
    })
    return sorted
  }, [initialClients, search, tagFilter, statusFilter, sortKey, sortDir])

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.client.id))
  const someSelected = !allSelected && rows.some((r) => selected.has(r.client.id))

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(rows.map((r) => r.client.id)))
    }
  }

  const toggleOne = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const uniqueStatuses = Array.from(
    new Set(initialClients.map((r) => r.relationship.status)),
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, email, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(typeof v === "string" ? v : "all")}
          >
            <SelectTrigger size="sm" className="min-w-28">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {uniqueStatuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TagFilterPopover
            tags={tags}
            selected={tagFilter}
            onChange={setTagFilter}
          />
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <BulkActions
              selectedIds={Array.from(selected)}
              tags={tags}
              onBulkTag={(tagId) =>
                bulkTagAction.execute({
                  clientIds: Array.from(selected),
                  tagId,
                })
              }
              onExport={() =>
                exportAction.execute({ clientIds: Array.from(selected) })
              }
              onClear={() => setSelected(new Set())}
            />
          )}
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger
              render={
                <Button>
                  <Plus className="size-3.5" />
                  Add client
                </Button>
              }
            />
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add a client</DialogTitle>
                <DialogDescription>
                  Create a new client record and optionally send a portal invite.
                </DialogDescription>
              </DialogHeader>
              <ClientForm
                onDone={() => {
                  setAddOpen(false)
                  router.refresh()
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>
                <SortHeader
                  label="Name"
                  active={sortKey === "name"}
                  dir={sortDir}
                  onClick={() => toggleSort("name")}
                />
              </TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>
                <SortHeader
                  label="Status"
                  active={sortKey === "status"}
                  dir={sortDir}
                  onClick={() => toggleSort("status")}
                />
              </TableHead>
              <TableHead>
                <SortHeader
                  label="Added"
                  active={sortKey === "created"}
                  dir={sortDir}
                  onClick={() => toggleSort("created")}
                />
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No clients match those filters.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => {
              const initials = row.client.fullName
                .split(" ")
                .map((n) => n[0])
                .filter(Boolean)
                .slice(0, 2)
                .join("")
                .toUpperCase()
              return (
                <TableRow
                  key={row.client.id}
                  data-state={selected.has(row.client.id) ? "selected" : undefined}
                >
                  <TableCell>
                    <Checkbox
                      checked={selected.has(row.client.id)}
                      onCheckedChange={() => toggleOne(row.client.id)}
                      aria-label={`Select ${row.client.fullName}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/clients/${row.client.id}`}
                      className="flex items-center gap-3 hover:text-primary"
                    >
                      <Avatar size="sm">
                        {row.client.avatarUrl && (
                          <AvatarImage src={row.client.avatarUrl} />
                        )}
                        <AvatarFallback>{initials || "?"}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {row.client.fullName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.client.email}
                        </p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {row.tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          className="text-[10px]"
                          style={{
                            borderColor: tag.color,
                            color: tag.color,
                          }}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {row.relationship.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.relationship.createdAt.toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Message ${row.client.fullName}`}
                        title="Message"
                        disabled={openingClientId === row.client.id}
                        onClick={() => openConversation(row.client.id)}
                      >
                        <MessageSquare className="size-3.5" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Row actions"
                            />
                          }
                        >
                          <MoreHorizontal className="size-3.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            render={
                              <Link href={`/dashboard/clients/${row.client.id}`} />
                            }
                          >
                            View profile
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openConversation(row.client.id)}
                          >
                            <MessageSquare className="size-3.5" />
                            Message
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() =>
                              archiveAction.execute({ id: row.client.id })
                            }
                          >
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string
  active: boolean
  dir: SortDir
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-left text-foreground hover:text-primary"
    >
      {label}
      <ArrowUpDown
        className={
          "size-3 " +
          (active
            ? dir === "asc"
              ? "rotate-180 text-foreground"
              : "text-foreground"
            : "text-muted-foreground")
        }
      />
    </button>
  )
}

function TagFilterPopover({
  tags,
  selected,
  onChange,
}: {
  tags: Tag[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((s) => s !== id))
    else onChange([...selected, id])
  }
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm">
            <Filter className="size-3.5" />
            Tags {selected.length > 0 && `(${selected.length})`}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-60">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Filter by tag</p>
          {selected.length > 0 && (
            <Button size="xs" variant="ghost" onClick={() => onChange([])}>
              <X className="size-3" />
              Clear
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-1 max-h-64 overflow-auto">
          {tags.length === 0 && (
            <p className="p-2 text-xs text-muted-foreground">
              No tags yet. Create one from a client&apos;s profile.
            </p>
          )}
          {tags.map((tag) => (
            <label
              key={tag.id}
              className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted"
            >
              <Checkbox
                checked={selected.includes(tag.id)}
                onCheckedChange={() => toggle(tag.id)}
              />
              <TagIcon className="size-3" style={{ color: tag.color }} />
              <span>{tag.name}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function BulkActions({
  selectedIds,
  tags,
  onBulkTag,
  onExport,
  onClear,
}: {
  selectedIds: string[]
  tags: Tag[]
  onBulkTag: (tagId: string) => void
  onExport: () => void
  onClear: () => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs">
      <span className="font-medium text-foreground">
        {selectedIds.length} selected
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="xs">
              <TagIcon className="size-3" />
              Apply tag
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Apply tag</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {tags.length === 0 && (
            <DropdownMenuItem disabled>No tags available</DropdownMenuItem>
          )}
          {tags.map((tag) => (
            <DropdownMenuItem
              key={tag.id}
              onClick={() => onBulkTag(tag.id)}
            >
              <TagIcon className="size-3" style={{ color: tag.color }} />
              {tag.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="outline" size="xs" onClick={onExport}>
        <Download className="size-3" />
        Export CSV
      </Button>
      <Button variant="ghost" size="xs" onClick={onClear}>
        <X className="size-3" />
      </Button>
    </div>
  )
}
