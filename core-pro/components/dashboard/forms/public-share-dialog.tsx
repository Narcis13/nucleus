"use client"

import { Copy } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createPublicShareAction } from "@/lib/actions/forms"
import type { Client } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// <PublicShareDialog>
//
// Mints a tokenized public share link for a form. Agent picks the *subject*
// client (e.g. apartment owner whose property the survey is about), an
// optional response cap, and an expiry. The raw URL is shown once, after
// creation — we only persist sha256(token), so there is no way to recover
// the link later.
// ─────────────────────────────────────────────────────────────────────────────
export function PublicShareDialog({
  open,
  onOpenChange,
  formId,
  clients,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  formId: string
  clients: Array<Pick<Client, "id" | "fullName" | "email">>
}) {
  const [subjectClientId, setSubjectClientId] = useState<string>("")
  const [maxResponses, setMaxResponses] = useState(1)
  const [expiresInDays, setExpiresInDays] = useState<number | "never">(30)
  const [createdUrl, setCreatedUrl] = useState<string | null>(null)

  // Base UI's <Select.Value> shows the raw value (a UUID) unless the root
  // Select gets an `items` prop mapping value → label.
  const subjectClientItems = useMemo(
    () => [
      { value: "none", label: "No subject — agent only" },
      ...clients.map((c) => ({ value: c.id, label: c.fullName })),
    ],
    [clients],
  )
  const expiresItems = useMemo(
    () => [
      { value: "1", label: "In 1 day" },
      { value: "7", label: "In 7 days" },
      { value: "30", label: "In 30 days" },
      { value: "90", label: "In 90 days" },
      { value: "never", label: "Never" },
    ],
    [],
  )

  // Reset state each time the dialog re-opens so a previously-created URL
  // doesn't bleed into a new session.
  useEffect(() => {
    if (open) {
      setSubjectClientId("")
      setMaxResponses(1)
      setExpiresInDays(30)
      setCreatedUrl(null)
    }
  }, [open])

  const action = useAction(createPublicShareAction, {
    onSuccess: ({ data }) => {
      if (data?.url) {
        setCreatedUrl(data.url)
        toast.success("Share link created.")
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't create share link.")
    },
  })

  const handleCreate = () => {
    action.execute({
      formId,
      subjectClientId: subjectClientId || null,
      maxResponses,
      expiresInDays: expiresInDays === "never" ? null : expiresInDays,
    })
  }

  const handleCopy = async () => {
    if (!createdUrl) return
    try {
      await navigator.clipboard.writeText(createdUrl)
      toast.success("Link copied.")
    } catch {
      toast.error("Couldn't copy — select and copy manually.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {createdUrl ? "Share link ready" : "Create a public share link"}
          </DialogTitle>
          <DialogDescription>
            {createdUrl
              ? "This is the only time you'll see this link. Copy it now and send it to the recipient."
              : "Mint a one-time link for someone outside your client list (e.g. a property viewer). Optionally tag the response with a client it's about — they'll be able to read submissions in their portal."}
          </DialogDescription>
        </DialogHeader>

        {createdUrl ? (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Input value={createdUrl} readOnly className="font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
              >
                <Copy className="size-3.5" />
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Once you close this dialog the link cannot be retrieved. If
              that happens, revoke the share and create a new one.
            </p>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="subject-client">
                About a client (optional)
              </Label>
              <Select
                value={subjectClientId || "none"}
                onValueChange={(v) =>
                  setSubjectClientId(!v || v === "none" ? "" : v)
                }
                items={subjectClientItems}
              >
                <SelectTrigger id="subject-client">
                  <SelectValue placeholder="No subject — agent only" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    No subject — agent only
                  </SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Pick the client this response is *about* (e.g. apartment
                owner). They'll see the response in their portal.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="max-responses">Max responses</Label>
                <Input
                  id="max-responses"
                  type="number"
                  min={1}
                  max={500}
                  value={maxResponses}
                  onChange={(e) =>
                    setMaxResponses(
                      Math.max(1, Math.min(500, Number(e.target.value) || 1)),
                    )
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="expires-in">Expires</Label>
                <Select
                  value={String(expiresInDays)}
                  onValueChange={(v) => {
                    if (!v) return
                    setExpiresInDays(v === "never" ? "never" : Number(v))
                  }}
                  items={expiresItems}
                >
                  <SelectTrigger id="expires-in">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">In 1 day</SelectItem>
                    <SelectItem value="7">In 7 days</SelectItem>
                    <SelectItem value="30">In 30 days</SelectItem>
                    <SelectItem value="90">In 90 days</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={action.isExecuting}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={action.isExecuting}>
                {action.isExecuting ? "Creating…" : "Create link"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
