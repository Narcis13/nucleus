"use client"

import { Plus, Tag as TagIcon, X } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  addTagToClientAction,
  createTagAction,
  removeTagFromClientAction,
} from "@/lib/actions/clients"
import type { Tag } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// <TagManager>
//
// Compact tag picker used on the client profile. Shows assigned tags as
// removable chips; a popover lets the user pick from existing tags or create
// a new one inline.
// ─────────────────────────────────────────────────────────────────────────────
export function TagManager({
  clientId,
  assignedTags,
  allTags,
}: {
  clientId: string
  assignedTags: Tag[]
  allTags: Tag[]
}) {
  const [pending, startTransition] = useTransition()
  const [newName, setNewName] = useState("")

  const addAction = useAction(addTagToClientAction, {
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't add tag.")
    },
  })
  const removeAction = useAction(removeTagFromClientAction, {
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't remove tag.")
    },
  })
  const createAction = useAction(createTagAction, {
    onSuccess: ({ data }) => {
      if (data?.tag) {
        addAction.execute({ clientId, tagId: data.tag.id })
        setNewName("")
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't create tag.")
    },
  })

  const assignedIds = new Set(assignedTags.map((t) => t.id))
  const available = allTags.filter((t) => !assignedIds.has(t.id))

  return (
    <div className="flex flex-wrap items-center gap-2">
      {assignedTags.length === 0 && (
        <p className="text-sm text-muted-foreground">No tags yet</p>
      )}
      {assignedTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          className="gap-1"
          style={{ borderColor: tag.color, color: tag.color }}
        >
          <TagIcon className="size-3" />
          {tag.name}
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() =>
              startTransition(() => {
                removeAction.execute({ clientId, tagId: tag.id })
              })
            }
            aria-label={`Remove tag ${tag.name}`}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <Popover>
        <PopoverTrigger
          render={
            <Button variant="outline" size="sm" disabled={pending}>
              <Plus className="size-3.5" />
              Add tag
            </Button>
          }
        />
        <PopoverContent align="start" className="w-64">
          <div className="flex flex-col gap-2">
            {available.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="px-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                  Existing
                </p>
                <div className="flex flex-wrap gap-1">
                  {available.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-1 text-xs hover:bg-muted"
                      style={{ color: tag.color }}
                      onClick={() =>
                        addAction.execute({ clientId, tagId: tag.id })
                      }
                    >
                      <TagIcon className="size-3" />
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <p className="px-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                Create new
              </p>
              <form
                className="flex gap-1"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!newName.trim()) return
                  createAction.execute({ name: newName.trim() })
                }}
              >
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="New tag…"
                  className="h-7"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={createAction.isExecuting}
                >
                  Create
                </Button>
              </form>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
