"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Client } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// <AssignDialog>
//
// Multi-select list of the professional's active clients. Used from the form
// builder to send a form to one or more clients in a single action.
// ─────────────────────────────────────────────────────────────────────────────
export function AssignDialog({
  open,
  onOpenChange,
  clients,
  onAssign,
  pending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  clients: Array<Pick<Client, "id" | "fullName" | "email">>
  onAssign: (clientIds: string[], dueDate?: string) => void
  pending: boolean
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dueDate, setDueDate] = useState("")
  const [search, setSearch] = useState("")

  const filtered = clients.filter((c) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      c.fullName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    )
  })

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSubmit = () => {
    if (selected.size === 0) return
    onAssign(Array.from(selected), dueDate || undefined)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign form to clients</DialogTitle>
          <DialogDescription>
            Clients will see this form on their portal and get a notification.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Input
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
            {filtered.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                {clients.length === 0
                  ? "Add a client before assigning a form."
                  : "No matches."}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((c) => (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-muted">
                      <Checkbox
                        checked={selected.has(c.id)}
                        onCheckedChange={() => toggle(c.id)}
                      />
                      <span className="flex flex-1 flex-col">
                        <span className="font-medium text-foreground">
                          {c.fullName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {c.email}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="due-date">Due date (optional)</Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={pending || selected.size === 0}
          >
            {pending
              ? "Assigning…"
              : `Assign (${selected.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
